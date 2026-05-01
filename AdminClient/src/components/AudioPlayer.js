/**
 * @file AudioPlayer.js - The AudioPlayer component.
 */

import React, { useState, useImperativeHandle, forwardRef, useRef, useEffect } from 'react';
import FeatherIcon from 'feather-icons-react';
import { useUniqueId } from '../utils/appUtils';
import config from '../config/config';

// pull variables from the config object
const restartTime = config.stream.restartTime;
const streamURL = config.stream.url;

// shared channel name for cross-tab coordination
const CHANNEL_NAME = 'driftconditions-player';

/**
 * AudioPlayer component to play and manage an audio stream.
 * @param {Object} props - The props object.
 * @param {boolean} props.showBar - Whether the bar player should be shown.
 * @param {boolean} props.isPlaying - Global playing state (from RootLayout).
 * @param {function} props.setIsPlaying - Function to set the playing state.
 * @param {function} props.togglePlayer - Function to toggle play/pause (from RootLayout).
 * @param {Object} ref - The ref object for controlling play/pause from parent.
 * @returns {JSX.Element} - The AudioPlayer component.
 */
const AudioPlayer = forwardRef(({ showBar, isPlaying, setIsPlaying, togglePlayer }, ref) => {
  const [playerKey, setPlayerKey] = useState(0);
  const audioRef = useRef(null);
  const uniqueId = useUniqueId();

  // cross-tab coordination refs
  const channelRef = useRef(null);       // BroadcastChannel instance
  const isActivePlayerRef = useRef(false); // true only in the tab actually playing audio
  const suppressRef = useRef(false);       // suppress handlePause when pausing programmatically
  const transferTimeoutRef = useRef(null); // cancellable timer for tab handoff jitter

  // restart the audio element after a delay (used on error or stream end)
  const audioRestart = () => {
    console.log('Attempting to restart audio stream...');
    setTimeout(() => {
      setPlayerKey(prevKey => prevKey + 1);
    }, restartTime);
  };

  const handleReady = () => {
    // console.log('Player is ready');
  };

  const handleError = (error) => {
    console.error('Error occurred while playing audio:', error);
    isActivePlayerRef.current = false;
    setIsPlaying(false);
    audioRestart();
  };

  // fired by the audio element when playback starts
  const handleStart = () => {
    console.log('Playback has started');
    isActivePlayerRef.current = true;
    setIsPlaying(true);
    channelRef.current?.postMessage({ type: 'play', id: uniqueId });
  };

  // fired by the audio element when playback pauses
  const handlePause = () => {
    // suppress if we paused programmatically in response to a broadcast
    if (suppressRef.current) {
      suppressRef.current = false;
      return;
    }
    // only the active player should broadcast stop
    if (!isActivePlayerRef.current) return;
    console.log('Playback has paused');
    isActivePlayerRef.current = false;
    setIsPlaying(false);
    channelRef.current?.postMessage({ type: 'stop', id: uniqueId });
  };

  const handleEnded = () => {
    console.log('Playback has ended');
    isActivePlayerRef.current = false;
    setIsPlaying(false);
    audioRestart();
  };

  // silence local audio without triggering a broadcast
  const silenceLocal = () => {
    if (audioRef.current && !audioRef.current.paused) {
      suppressRef.current = true;
      audioRef.current.pause();
    }
  };

  // BroadcastChannel: setup and cross-tab message handling
  useEffect(() => {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;

    channel.onmessage = ({ data: { type, id } }) => {
      if (id === uniqueId) return;

      if (type === 'play') {
        // another tab started — cancel any pending handoff, silence this tab, show playing
        if (transferTimeoutRef.current) {
          clearTimeout(transferTimeoutRef.current);
          transferTimeoutRef.current = null;
        }
        silenceLocal();
        setIsPlaying(true);

      } else if (type === 'stop') {
        // another tab stopped — cancel any pending handoff, silence this tab, show stopped
        if (transferTimeoutRef.current) {
          clearTimeout(transferTimeoutRef.current);
          transferTimeoutRef.current = null;
        }
        silenceLocal();
        setIsPlaying(false);

      } else if (type === 'transfer') {
        // playing tab is closing — schedule a play attempt with random jitter;
        // first tab to start broadcasts 'play', causing all others to cancel
        transferTimeoutRef.current = setTimeout(() => {
          transferTimeoutRef.current = null;
          audioRef.current?.play();
        }, Math.random() * 150);

      } else if (type === 'query') {
        // new tab asking for current state — respond if we're the active player
        if (isActivePlayerRef.current) {
          channel.postMessage({ type: 'play', id: uniqueId });
        }
      }
    };

    return () => channel.close();
  }, [uniqueId]);

  // signal transfer to open tabs before this tab closes
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isActivePlayerRef.current) {
        channelRef.current?.postMessage({ type: 'transfer', id: uniqueId });
        suppressRef.current = true; // suppress the browser-triggered handlePause during teardown
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [uniqueId]);

  // query open tabs on mount to establish initial display state without starting audio
  useEffect(() => {
    channelRef.current?.postMessage({ type: 'query', id: uniqueId });
  }, [uniqueId]);

  // expose play and pause to parent (RootLayout via togglePlayer)
  useImperativeHandle(ref, () => ({
    play: () => {
      if (audioRef.current) audioRef.current.play();
      // handleStart fires on play and broadcasts intent
    },
    pause: () => {
      // broadcast stop intent first, then silence local audio
      isActivePlayerRef.current = false;
      setIsPlaying(false);
      channelRef.current?.postMessage({ type: 'stop', id: uniqueId });
      silenceLocal();
    },
  }));

  return (
    <div className={`player text-center ${showBar || isPlaying ? 'visible' : 'hidden'}`}>
      <div className={`faux-player ${isPlaying ? 'playing' : ''}`}>
        <div className="audio-overlay" onClick={togglePlayer}>
          <div className="play-button"><FeatherIcon icon="play" /></div>
          <div className="pause-button"><FeatherIcon icon="pause" /></div>
          <div className="text">Listen live</div>
          <div className="play-line"><FeatherIcon icon="circle" /></div>
          <div className="volume"><FeatherIcon icon="volume-2" /></div>
        </div>
      </div>
      <audio
        ref={audioRef}
        key={playerKey}
        src={streamURL}
        style={{ display: 'none' }}
        onCanPlay={handleReady}
        onPlay={handleStart}
        onPause={handlePause}
        onEnded={handleEnded}
        onError={handleError}
      />
    </div>
  );
});

export default AudioPlayer;
