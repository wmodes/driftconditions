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

// Bind SDK to our hidden <audio> element so custom UI is not covered by cast-media-player
const options = new cast.framework.CastReceiverOptions();
options.mediaElement = document.getElementById('cast-audio-engine');
options.maxInactivity = 3600; // prevent idle/screensaver during audio playback

context.start(options);
