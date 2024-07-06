/**
 * @file AudioPlayer.js - The AudioPlayer component.
 */

import React, { useState, useImperativeHandle, forwardRef, useRef, useEffect } from 'react';
import { useUniqueId } from '../utils/appUtils';
import config from '../config/config';

// pull variables from the config object
const restartTime = config.stream.restartTime;
const streamURL = config.stream.url;

/**
 * AudioPlayer component to play and manage an audio stream.
 * @param {Object} props - The props object.
 * @param {boolean} props.isVisible - Whether the audio player is visible.
 * @param {function} props.setIsPlaying - Function to set the playing state.
 * @param {Object} ref - The ref object for controlling play/pause from parent.
 * @returns {JSX.Element} - The AudioPlayer component.
 */
const AudioPlayer = forwardRef(({ isVisible, setIsPlaying }, ref) => {
  const [playerKey, setPlayerKey] = useState(0); 
  const audioRef = useRef(null);
  const uniqueId = useUniqueId();
  const [isPlaying, setLocalIsPlaying] = useState(false);

  // console.log(`AudioPlayer: uniqueId: ${uniqueId}`);

  // Function to restart the audio after a delay
  const audioRestart = () => {
    console.log('Attempting to restart audio stream...');
    setTimeout(() => {
      setPlayerKey(prevKey => prevKey + 1);
    }, restartTime); // Wait before retrying
  };

  const handleReady = () => {
    // console.log('Player is ready');
  };

  const handleError = (error) => {
    console.error('Error occurred while playing audio:', error);
    setIsPlaying(false);
    setLocalIsPlaying(false);
    audioRestart(); // Call to restart the audio on error
  };

  const handleStart = () => {
    console.log('Playback has started');
    setIsPlaying(true);
    setLocalIsPlaying(true);
    localStorage.setItem('audioPlayerState', JSON.stringify({ id: uniqueId, state: true }));
  };

  const handlePause = () => {
    console.log('Playback has paused');
    setIsPlaying(false);
    setLocalIsPlaying(false);
    localStorage.setItem('audioPlayerState', JSON.stringify({ id: uniqueId, state: false }));
  };

  const handleEnded = () => {
    console.log('Playback has ended');
    setIsPlaying(false);
    setLocalIsPlaying(false);
    audioRestart(); // Call to restart the audio on error
  };

  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === 'audioPlayerState' && event.newValue) {
        const { id, state } = JSON.parse(event.newValue);
        if (id !== uniqueId) {
          // console.log(`AudioPlayer: uniqueId: ${uniqueId} received state change from id: ${id}`);
          setLocalIsPlaying(state);
          if (state) {
            audioRef.current.pause();
          } else {
            audioRef.current.play();
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [uniqueId]);

  useEffect(() => {
    const storedState = localStorage.getItem('audioPlayerState');
    if (storedState) {
      const { state } = JSON.parse(storedState);
      setLocalIsPlaying(state);
      if (state) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  }, []);

  // Expose the play and pause methods to the parent component using forwardRef
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
    <div className={`player text-center ${isVisible || isPlaying ? 'visible' : 'hidden'}`}>
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
