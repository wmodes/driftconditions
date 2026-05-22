// Background playback handler — required by react-native-track-player
// This module runs in a separate thread and handles remote control events
import TrackPlayer, { Event } from 'react-native-track-player';

module.exports = async function () {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.stop()); // stop so resume reconnects live stream fresh
};
