import React, { useState } from 'react';

import config from '../config/config';
// pull variables from the config object
const restartTime = config.stream.restartTime;

const AudioPlayer = ({ url }) => {
  const [playerKey, setPlayerKey] = useState(0); // key to force re-render of the audio element

  // Function to restart the audio after a delay
  const audioRestart = () => {
    console.log('Attempting to restart audio stream...');
    setTimeout(() => {
      // Update key to force re-render and thus reinitialization of the audio element
      setPlayerKey(prevKey => prevKey + 1);
    }, restartTime); // Wait before retrying
  };

  const handleReady = () => {
    console.log('Player is ready');
  };

  const handleError = (error) => {
    console.error('Error occurred while playing audio:', error);
    audioRestart(); // Call to restart the audio on error
  };

  const handleStart = () => {
    console.log('Playback has started');
  };

  const handlePause = () => {
    console.log('Playback has paused');
  };

  const handleEnded = () => {
    console.log('Playback has ended');
    audioRestart(); // Call to restart the audio on error
  };

  return (
    <audio
      key={playerKey}
      src={url}
      controls
      autoPlay
      onCanPlay={handleReady}
      onPlay={handleStart}
      onPause={handlePause}
      onEnded={handleEnded}
      onError={handleError}
      style={{ width: '100%' }}
    >
      Your browser does not support the audio element.
    </audio>
  );
};

export default AudioPlayer;
