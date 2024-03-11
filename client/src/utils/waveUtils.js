import WaveSurfer from 'wavesurfer.js';
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline.esm.js'
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js'
import config from '../config/config';

const wsConfig = config.wavesurfer;

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

export const initWaveSurfer = async (containerId, audioUrl, onReadyCallback) => {
  const url = await fetchAudioFile(audioUrl);
  
  const ws = WaveSurfer.create({
    ...wsConfig,
    container: `#${containerId}`,
    url,
    plugins: [TimelinePlugin.create()],
  });

  // Initialize the Regions plugin
  const wsRegions = ws.registerPlugin(RegionsPlugin.create())
  wsRegions.enableDragSelection({
    color: 'rgba(255, 0, 0, 0.1)',
  })
  wsRegions.on('region-updated', (region) => {
    console.log('Updated region', region)
  })

  waveSurferEvents(ws);
  
  return ws;
};

function waveSurferEvents (ws) {
    // Add click play/pause listener
    ws.on('click', () => {
      ws.playPause();
    });
    // Add spacebar play/pause listener
    document.addEventListener('keydown', (event) => {
      if (event.code === "Space" && !isFocusInsideForm()) {
        event.preventDefault(); // Prevent the default spacebar action (scrolling)
        ws.playPause();
      }
    });
}

function isFocusInsideForm() {
  const activeElement = document.activeElement;
  return activeElement && (activeElement.classList.contains('form-field') || activeElement.classList.contains('form-textarea'));
}
