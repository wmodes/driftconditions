import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import TrackPlayer, { usePlaybackState, State, Capability } from 'react-native-track-player';
import config from '../config';
import { loadHearts, toggleHeart as toggleHeartStorage } from '../utils/heartUtils';

const PlayerContext = createContext(null);
const POLL_MS = 30000;

function getDisplayTitle(mix) {
  if (!mix) return null;
  let clips = mix.playlist || [];
  if (!Array.isArray(clips)) clips = clips.playlist || [];
  return clips[0]?.title || clips[0]?.filename || null;
}

async function setupPlayer() {
  await TrackPlayer.setupPlayer();
  await TrackPlayer.updateOptions({
    capabilities: [Capability.Play, Capability.Pause],
    compactCapabilities: [Capability.Play, Capability.Pause],
  });
  await TrackPlayer.add({
    id: 'stream',
    url: config.stream.url,
    title: config.stream.title,
    artist: config.stream.artist,
    isLiveStream: true,
  });
}

async function fetchPlaylist() {
  const res = await fetch(`${config.api.mixEngine}/api/queue/getplaylist`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function PlayerProvider({ children }) {
  const playbackState = usePlaybackState();
  const [ready, setReady] = useState(false);
  const [currentMix, setCurrentMix] = useState(null);
  // mixList: data[1] (current) through end; data[0] is Liquidsoap prefetch, skipped
  const [mixList, setMixList] = useState([]);

  useEffect(() => {
    setupPlayer()
      .then(() => setReady(true))
      .catch(err => console.warn('Player setup:', err));
    return () => TrackPlayer.reset();
  }, []);

  const loadPlaylist = async () => {
    try {
      const data = await fetchPlaylist();
      const mix = data?.[1] || null;
      setCurrentMix(mix);
      setMixList(data?.slice(1) || []);
      // Sync Now Playing metadata for lock screen
      if (mix) {
        let clips = mix.playlist || [];
        if (!Array.isArray(clips)) clips = clips.playlist || [];
        await TrackPlayer.updateMetadataForTrack(0, {
          title: clips[0]?.title || clips[0]?.filename || 'DriftConditions',
          artist: 'DriftConditions',
          artwork: mix.coverImage
            ? `https://driftconditions.org/${mix.coverImage}`
            : undefined,
        });
      }
    } catch (err) {
      console.warn('Playlist fetch:', err);
    }
  };

  useEffect(() => {
    loadPlaylist();
    const timer = setInterval(loadPlaylist, POLL_MS);
    return () => clearInterval(timer);
  }, []);

  const isPlaying = playbackState.state === State.Playing;
  const isLoading =
    !ready ||
    playbackState.state === State.Loading ||
    playbackState.state === State.Buffering;

  const toggle = async () => {
    if (isPlaying) {
      await TrackPlayer.stop(); // stop fully so resume reconnects live stream fresh
    } else {
      await TrackPlayer.play();
    }
  };

  const [heartedIds, setHeartedIds] = useState(new Set());

  // Load persisted hearts on mount
  useEffect(() => {
    loadHearts().then(setHeartedIds).catch(() => {});
  }, []);

  const toggleHeart = useCallback(async (mixID) => {
    if (!mixID) return;
    // Optimistic update
    const wasHearted = heartedIds.has(mixID);
    setHeartedIds(prev => {
      const next = new Set(prev);
      wasHearted ? next.delete(mixID) : next.add(mixID);
      return next;
    });
    // Persist + sync server (heartUtils handles prune, storage, and API call)
    const nowHearted = await toggleHeartStorage(mixID);
    // Reconcile if server result differs from optimistic
    setHeartedIds(prev => {
      const next = new Set(prev);
      nowHearted ? next.add(mixID) : next.delete(mixID);
      return next;
    });
  }, [heartedIds]);

  return (
    <PlayerContext.Provider
      value={{ isPlaying, isLoading, ready, toggle, currentMix, mixList, loadPlaylist, displayTitle: getDisplayTitle(currentMix), heartedIds, toggleHeart }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  return useContext(PlayerContext);
}
