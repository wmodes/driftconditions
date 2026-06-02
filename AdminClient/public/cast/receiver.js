/**
 * @file receiver.js — DriftConditions Google Cast custom receiver.
 *
 * Runs on the Cast device (Google TV, Nest Audio, etc.). Plays the live
 * Icecast stream and listens on a custom namespace for metadata pushes
 * from the iOS sender app, updating cover art and track title without
 * interrupting playback.
 *
 * Custom message namespace: urn:x-cast:org.driftconditions.app
 * Expected message shape: { coverImage, title, subtitle }
 */

/* global cast */

/** @const {string} Custom Cast namespace shared with the iOS sender. */
const NAMESPACE = 'urn:x-cast:org.driftconditions.app';

const context     = cast.framework.CastReceiverContext.getInstance();
const playerManager = context.getPlayerManager();

const coverEl       = document.getElementById('cover');
const placeholderEl = document.getElementById('cover-placeholder');
const trackListEl   = document.getElementById('track-list');
const bgLayers      = [document.getElementById('bg-a'), document.getElementById('bg-b')];
let activeBgIdx     = 0;

/**
 * Updates the receiver UI with new metadata.
 * Safe to call with partial data — only defined fields are applied.
 *
 * @param {object} opts
 * @param {string}   [opts.coverImage] - Absolute URL of the cover image.
 * @param {string[]} [opts.tracks]     - Ordered list of clip titles to display.
 */
function updateUI({ coverImage, tracks }) {
  if (coverImage) {
    placeholderEl.style.display = 'none';
    coverEl.onload = () => coverEl.classList.add('loaded');
    coverEl.src = coverImage;

    // Preload image, then crossfade background layers.
    // Double rAF ensures the browser paints the initial opacity:0 state
    // before the transition fires — without it the fade is skipped.
    const img = new Image();
    img.onload = () => {
      const next    = bgLayers[1 - activeBgIdx];
      const current = bgLayers[activeBgIdx];
      next.style.backgroundImage = `url('${coverImage}')`;
      next.style.zIndex    = '-1';  // new image on top
      current.style.zIndex = '-2';  // old image behind
      requestAnimationFrame(() => requestAnimationFrame(() => {
        next.style.opacity    = '0.3';
        current.style.opacity = '0';
        activeBgIdx = 1 - activeBgIdx;
      }));
    };
    img.src = coverImage;
  }
  if (tracks && tracks.length > 0) {
    trackListEl.classList.remove('empty');
    trackListEl.innerHTML = tracks
      .map(t => `<li>${t}</li>`)
      .join('');
  }
}

// Receive metadata updates from the iOS sender without reloading the stream.
// Expected shape: { coverImage, tracks }
context.addCustomMessageListener(NAMESPACE, (event) => {
  const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
  updateUI(data || {});
});

// Intercept LOAD requests — always redirect to our stream URL and apply
// any metadata included in the load request.
playerManager.setMessageInterceptor(
  cast.framework.messages.MessageType.LOAD,
  (request) => {
    // contentUrl comes from the sender (config.stream.url) — don't override it
    request.media.contentType = 'audio/mpeg';
    request.media.streamType  = cast.framework.messages.StreamType.LIVE;
    request.media.duration    = -1; // required for live streams per Cast SDK docs
    if (request.media.metadata) {
      updateUI({
        coverImage: request.media.metadata.images?.[0]?.url,
        tracks:     request.media.metadata.tracks,
      });
    }
    return request;
  }
);

// Live streams don't support seeking — required per Cast SDK live stream docs
playerManager.removeSupportedMediaCommands(cast.framework.messages.Command.SEEK, true);

// VU meter — Web Audio API analysis of the hidden audio element
const canvas    = document.getElementById('vu-meter');
const canvasCtx = canvas ? canvas.getContext('2d') : null;
let audioCtx  = null;
let analyser  = null;
let smoothed  = 0;

/**
 * Initialise AudioContext and connect audio element to AnalyserNode.
 * Must be called after playback starts so the AudioContext isn't suspended.
 */
function initAnalyser() {
  if (audioCtx) return;
  const audioEl = document.getElementById('cast-audio-engine');
  audioCtx = new AudioContext();
  const source = audioCtx.createMediaElementSource(audioEl);
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.75;
  source.connect(analyser);
  source.connect(audioCtx.destination);
  drawMeter();
}

/** Draw one frame of the level meter and schedule the next. */
function drawMeter() {
  requestAnimationFrame(drawMeter);
  if (!analyser || !canvasCtx) return;

  const data = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(data);

  // RMS of the waveform — normalized to 0..1
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    const s = (data[i] / 128) - 1;
    sum += s * s;
  }
  const rms = Math.sqrt(sum / data.length);

  // Smooth: fast attack, slow decay
  const target = Math.min(rms * 5, 1);
  smoothed = target > smoothed ? target * 0.6 + smoothed * 0.4
                               : target * 0.05 + smoothed * 0.95;

  const w = canvas.width = canvas.offsetWidth;
  const h = canvas.height = canvas.offsetHeight;
  const fill = Math.round(w * smoothed);

  // Background
  canvasCtx.fillStyle = '#1a1a1a';
  canvasCtx.fillRect(0, 0, w, h);

  // Level gradient: deep blue → app blue → light blue → amber at peaks
  const grad = canvasCtx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0,    '#1e4d7a');
  grad.addColorStop(0.65, '#336699');
  grad.addColorStop(0.85, '#5599bb');
  grad.addColorStop(1,    '#cc8833');
  canvasCtx.fillStyle = grad;
  canvasCtx.fillRect(0, 0, fill, h);
}

playerManager.addEventListener(
  cast.framework.events.EventType.PLAYING,
  () => {
    try {
      if (audioCtx) audioCtx.resume(); else initAnalyser();
    } catch (e) {
      console.warn('VU meter init error:', e);
    }
  }
);

// Bind SDK to our hidden <audio> element so custom UI is not covered by cast-media-player
const options = new cast.framework.CastReceiverOptions();
options.mediaElement = document.getElementById('cast-audio-engine');

context.start(options);
