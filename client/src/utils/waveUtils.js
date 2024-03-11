import WaveSurfer from 'wavesurfer.js';
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline.esm.js'
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
  
  const wavesurfer = WaveSurfer.create({
    ...wsConfig,
    container: `#${containerId}`,
    url,
    plugins: [TimelinePlugin.create()],
  });

  wavesurfer.on('ready', () => {
    onReadyCallback(wavesurfer);
    wavesurfer.on('click', () => wavesurfer.playPause());
  });

  return wavesurfer;
};
