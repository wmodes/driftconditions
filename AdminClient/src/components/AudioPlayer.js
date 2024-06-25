import React, { useState, useImperativeHandle, forwardRef, useRef  } from 'react';

import config from '../config/config';
// pull variables from the config object
const restartTime = config.stream.restartTime;
const streamURL = config.stream.url;

const AudioPlayer = forwardRef(({ isVisible, setIsPlaying }, ref) => {
  // key to force re-render of the audio element
  const [playerKey, setPlayerKey] = useState(0); 
  // Create a ref for the audio element
  const audioRef = useRef(null);

  // Function to restart the audio after a delay
  const audioRestart = () => {
    console.log('Attempting to restart audio stream...');
    setTimeout(() => {
      // Update key to force re-render and thus reinitialization of the audio element
      setPlayerKey(prevKey => prevKey + 1);
    }, restartTime); // Wait before retrying
  };

  const handleReady = () => {
    // console.log('Player is ready');
  };

  const handleError = (error) => {
    console.error('Error occurred while playing audio:', error);
    setIsPlaying(false);
    audioRestart(); // Call to restart the audio on error
  };

  const handleStart = () => {
    console.log('Playback has started');
    setIsPlaying(true);
  };

  const handlePause = () => {
    console.log('Playback has paused');
    setIsPlaying(false);
  };

  const handleEnded = () => {
    console.log('Playback has ended');
    setIsPlaying(false);
    audioRestart(); // Call to restart the audio on error
  };

  // Expose the play method to the parent component using forwardRef
  useImperativeHandle(ref, () => ({
    play: () => {
      if (audioRef.current) {
        audioRef.current.play();
      }
    },
    pause: () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }
  }));

  return (
    <div className={`player text-center ${isVisible ? 'visible' : 'hidden'}`}>
      <div className="flex justify-center w-full">
        <audio
          ref={audioRef}
          key={playerKey}
          src={streamURL}
          controls
          autoPlay
          onCanPlay={handleReady}
          onPlay={handleStart}
          onPause={handlePause}
          onEnded={handleEnded}
          onError={handleError}
        >
          Your browser does not support the audio element.
        </audio>
      </div>
    </div>
  );
});

export default AudioPlayer;
