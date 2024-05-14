// AudioPlayer.js
import React from 'react';
import ReactPlayer from 'react-player';

import config from '../config/config';
// pull variables from the config object
const restartTime = config.stream.restartTime;

const AudioPlayer = ({ url }) => {

  // Function to restart the audio after a delay
  const audioRestart = () => {
    console.log('Attempting to restart audio stream...');
    setTimeout(() => {
      // Update key to force re-render and thus reinitialization of ReactPlayer
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
    <ReactPlayer
      url={url}
      playing={true}
      controls={true}
      width="100%"
      height="40px"
      onReady={handleReady}
      onStart={handleStart}
      onPause={handlePause}
      onEnded={handleEnded}
      onError={handleError}
    />
  );
};

export default AudioPlayer;
