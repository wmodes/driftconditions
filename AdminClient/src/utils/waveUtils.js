import WaveSurfer from 'wavesurfer.js';
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline.esm.js'
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js'
import config from '../config/config';

const wsConfig = config.wavesurfer;
const wsRegionsConfig = wsConfig.plugins.regions;

// Global variable to store the WaveSurfer instance
let ws = null; 
// eslint-disable-next-line
let wsRegions = null;

// Fetch the audio file as a blob and return the URL
export const fetchAudioFile = async (audioUrl) => {
  try {
    const response = await fetch(audioUrl, {
      credentials: 'include', // Include cookies for cross-origin requests
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Error fetching audio file:', error);
    throw error;
  }
};

// initialize WaveSurfer with the audio file and return the instance
export const initWaveSurfer = async (audioUrl, onReadyCallback) => {
  // console.log('currentWaveSurfer before creating new one:', currentWaveSurfer);
  // Destroy the current instance if it exists
  if (ws) {
    destroyWaveSurfer();
  }
  // get audio file URL 
  const url = await fetchAudioFile(audioUrl);
  ws = WaveSurfer.create({
    ...wsConfig,
    url,
    plugins: [
      TimelinePlugin.create(),
      RegionsPlugin.create({
        dragSelection: {
          color: 'rgba(255, 0, 0, 0.1)',
        }
      })
    ],
  });
  ws.on('ready', () => {
    onReadyCallback(ws);
  });

  // Initialize the Regions plugin
  wsRegions = initRegions(ws);

  // Handle events such as play/pause on click and spacebar press
  waveSurferEvents(ws);

  return ws;
};

// Destroy the WaveSurfer instance
export const destroyWaveSurfer = () => {
  if (ws) {
    ws.destroy();
    // Reset the reference to ensure it can't be used after being destroyed
    ws = null; 
    // console.log('WaveSurfer instance destroyed.');
  }
};

function waveSurferEvents (ws) {
  // Add click play/pause listener
  ws.on('click', () => {
    ws.playPause();
  });
  // Add spacebar play/pause listener
  document.addEventListener('keydown', (event) => {
    if (event.code === "Space" && !isFocusInsideInputOrTextarea()) {
      event.preventDefault(); // Prevent the default spacebar action (scrolling)
      ws.playPause()
        .then(() => {
          // console.log('Spacebar play/pause');
        })
        .catch(err => {
          console.error('Spacebar play/pause error. Try clicking within the page.');
        });
    }
  });
}

function isFocusInsideInputOrTextarea() {
  const activeElement = document.activeElement;
  return activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');
}

function initRegions(ws) {

  // Initialize the Regions plugin
  const wsRegions = ws.registerPlugin(RegionsPlugin.create())
  wsRegions.enableDragSelection({
    color: wsRegionsConfig.dragSelection.color,
  })

  wsRegions.on('region-created', (region) => {
    // delete all but this new region
    wsRegions.getRegions().forEach((r) => {
      if (r.id !== region.id) {
        r.remove();
      }
    });
  })

  wsRegions.on('region-clicked', (region, e) => {
    e.stopPropagation(); // prevent triggering a click on the waveform
    // activeRegion = region;
    region.play();
  })
  // stop playing when we get to the end of the region
  wsRegions.on('region-out', (region) => {
    // console.log('region-out', region)
    ws.pause()
  })

  wsRegions.on('region-updated', (region) => {
    // console.log('Updated region', region)
  })

  return wsRegions;
}
