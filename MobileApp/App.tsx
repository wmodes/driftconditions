import React, { useState, useEffect, useRef } from 'react';
import { useRemoteMediaClient, useCastState, CastState, useMediaStatus, MediaPlayerState, useDevices, useCastChannel } from 'react-native-google-cast';
import { View, StatusBar, StyleSheet, Linking } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import TrackPlayer from 'react-native-track-player';

import { PlayerProvider, usePlayer } from './src/context/PlayerContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import PlayerScreen from './src/screens/PlayerScreen';
import PlaylistScreen from './src/screens/PlaylistScreen';
import LoginScreen from './src/screens/LoginScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import UploadScreen from './src/screens/UploadScreen';
import ProfileButton from './src/components/ProfileButton';
import config from './src/config';
import ControlBar from './src/components/ControlBar';
import MiniPlayerBar from './src/components/MiniPlayerBar';
import SleepTimerModal from './src/modals/SleepTimerModal';

type Screen = 'player' | 'playlist' | 'login' | 'forgotpassword' | 'profile' | 'upload';

const CAST_NAMESPACE = 'urn:x-cast:org.driftconditions.app';

function AppContent() {
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState<Screen>('player');
  const [incomingFile, setIncomingFile] = useState<any>(null);
  const castClientRef = useRef<any>(null);
  const castMediaRequestRef = useRef<any>(null);
  const castLoadingRef = useRef(false);
  const castClient = useRemoteMediaClient();
  const castState = useCastState();
  const mediaStatus = useMediaStatus();
  const devices = useDevices();
  const castChannel = useCastChannel(CAST_NAMESPACE);
  const castChannelRef = useRef<any>(null);
  useEffect(() => {
    castChannelRef.current = castChannel;
    console.log(`[${ts()}] castChannel changed:`, !!castChannel);
    // Send metadata as soon as channel is ready (first connection timing fix)
    if (castChannel?.connected && castState === CastState.CONNECTED) {
      sendCastMetadata(currentMixRef.current);
    }
  }, [castChannel]);
  // Derive cast state from SDK hooks — single source of truth
  const isCasting = castState === CastState.CONNECTED;
  const castIsPlaying = mediaStatus?.playerState === MediaPlayerState.PLAYING
    || mediaStatus?.playerState === MediaPlayerState.BUFFERING;
  const [sleepModalVisible, setSleepModalVisible] = useState(false);
  const [sleepEndTime, setSleepEndTime] = useState<number | null>(null);
  // Tick forces re-render so the minutes countdown updates
  const [, setTick] = useState(0);
  const fadeRef = useRef<NodeJS.Timeout | null>(null);

  const sleepMinutesLeft =
    sleepEndTime != null
      ? Math.max(1, Math.ceil((sleepEndTime - Date.now()) / 60000))
      : null;

  // Tick every 30s while timer is active so the displayed minutes stay current
  useEffect(() => {
    if (!sleepEndTime) return;
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, [sleepEndTime]);

  // Fire the actual stop when sleep time arrives
  useEffect(() => {
    if (!sleepEndTime) return;
    const remaining = sleepEndTime - Date.now();
    if (remaining <= 0) {
      setSleepEndTime(null);
      return;
    }

    let cancelled = false;

    const timeout = setTimeout(() => {
      setSleepEndTime(null);
      // Fade volume to 0 over 10 seconds then pause
      let step = 0;
      fadeRef.current = setInterval(async () => {
        if (cancelled) {
          clearInterval(fadeRef.current!);
          return;
        }
        step++;
        await TrackPlayer.setVolume(Math.max(0, 1 - step * 0.1));
        if (step >= 10) {
          clearInterval(fadeRef.current!);
          if (!cancelled) {
            await TrackPlayer.pause();
            await TrackPlayer.setVolume(1);
          }
        }
      }, 1000);
    }, remaining);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      if (fadeRef.current) {
        clearInterval(fadeRef.current);
        TrackPlayer.setVolume(1);
      }
    };
  }, [sleepEndTime]);

  const startSleepTimer = (minutes: number) => {
    setSleepEndTime(Date.now() + minutes * 60000);
    setSleepModalVisible(false);
  };

  const cancelSleepTimer = () => {
    setSleepEndTime(null);
    TrackPlayer.setVolume(1);
  };

  const { isAuthenticated } = useAuth();
  const { currentMix, displayTitle } = usePlayer();
  const currentMixRef = useRef<any>(null);
  useEffect(() => { currentMixRef.current = currentMix; }, [currentMix]);

  const sendCastMetadata = (mix: any, retries = 5) => {
    if (!castChannelRef.current?.connected) {
      if (retries > 0) {
        setTimeout(() => sendCastMetadata(mix, retries - 1), 500);
      } else {
        console.log('sendCastMetadata — channel never became ready');
      }
      return;
    }
    const clips = Array.isArray(mix?.playlist) ? mix.playlist : (mix?.playlist?.playlist || []);
    const tracks = clips.map((c: any) => c.title || c.filename).filter(Boolean);
    console.log('sendCastMetadata — coverImage:', !!mix?.coverImage, 'tracks:', tracks);
    castChannelRef.current.sendMessage(JSON.stringify({
      coverImage: mix?.coverImage ? `https://driftconditions.org/${mix.coverImage}` : null,
      tracks,
    })).catch((e: any) => console.warn('sendCastMetadata sendMessage error:', e));
  };

  // Diagnostic: track discovery cycles via device list changes
  const ts = () => new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
  useEffect(() => {
    console.log(`[${ts()}] Cast devices changed: ${devices.length} device(s) —`, devices.map(d => d.friendlyName));
  }, [devices]);

  useEffect(() => {
    console.log(`[${ts()}] Cast state: ${castState}`);
  }, [castState]);

  // Cast: react to connection state changes using hooks (road more traveled in 4.6.1)
  useEffect(() => {
    const handleCastStateChange = async () => {
      console.log('Cast state changed:', castState, 'client:', !!castClient);
      if (castState === CastState.CONNECTED && castClient) {
        if (castLoadingRef.current) return; // effect fired twice — already loading
        castLoadingRef.current = true;
        const { State } = require('react-native-track-player');
        const playbackState = await TrackPlayer.getPlaybackState();
        const wasPlaying = playbackState.state === State.Playing;
        console.log('Cast connected — wasPlaying:', wasPlaying);
        await TrackPlayer.pause();
        castClientRef.current = castClient;
        const mediaRequest = {
          mediaInfo: {
            contentUrl: config.stream.url,
            contentType: 'audio/mpeg',
            streamType: 'live',
            duration: -1,
            metadata: {
              type: 'generic',
              title: 'DriftConditions',
              subtitle: 'Live Stream',
              images: currentMixRef.current?.coverImage
                ? [{ url: `https://driftconditions.org/${currentMixRef.current.coverImage}` }]
                : [],
            },
          },
        };
        castMediaRequestRef.current = mediaRequest;
        console.log('Cast loadMedia starting...');
        castClient
          .loadMedia({ ...mediaRequest, autoplay: wasPlaying })
          .then(() => {
            console.log('Cast loadMedia success — autoplay:', wasPlaying);
            sendCastMetadata(currentMixRef.current);
          })
          .catch((e: any) => console.warn('Cast loadMedia error:', e));
      } else if (castState === CastState.NOT_CONNECTED) {
        castClientRef.current = null;
        castLoadingRef.current = false;
      }
    };
    handleCastStateChange();
  }, [castState, castClient]);

  const castToggle = async () => {
    if (!castClient) return;
    console.log(`[${ts()}] Cast toggle — castIsPlaying:`, castIsPlaying, 'playerState:', mediaStatus?.playerState);
    try {
      if (castIsPlaying) {
        await castClient.stop();
      } else if (mediaStatus?.playerState === MediaPlayerState.PAUSED) {
        // Media loaded and paused — resume directly
        await castClient.play();
      } else {
        // IDLE — live stream must reload to start
        console.log('Cast toggle — calling loadMedia, request:', !!castMediaRequestRef.current);
        await castClient.loadMedia({
          ...castMediaRequestRef.current,
          autoplay: true,
        });
        console.log('Cast toggle — loadMedia resolved');
      }
    } catch (e) {
      console.warn('Cast toggle error:', e);
    }
  };

  // Push metadata to Cast receiver when mix changes — no stream reload
  useEffect(() => {
    if (castClientRef.current) sendCastMetadata(currentMix);
  }, [currentMix?.mixID]);

  // Navigate to player after OAuth or any async sign-in completes
  useEffect(() => {
    if (isAuthenticated && (screen === 'login' || screen === 'forgotpassword')) {
      setScreen('player');
    }
  }, [isAuthenticated, screen]);

  // Handle audio files shared from Voice Memos / Files / other apps
  useEffect(() => {
    const AUDIO_EXTS = /\.(mp3|m4a|wav|ogg|flac|aiff|aif)$/i;
    const MIME_MAP: Record<string, string> = {
      mp3: 'audio/mpeg', m4a: 'audio/x-m4a', wav: 'audio/wav',
      ogg: 'audio/ogg', flac: 'audio/flac', aiff: 'audio/aiff', aif: 'audio/aiff',
    };
    const handleIncomingUrl = (url: string) => {
      if (!url?.startsWith('file://') || !AUDIO_EXTS.test(url)) return;
      const name = decodeURIComponent(url.split('/').pop() || 'audio');
      const ext = name.split('.').pop()?.toLowerCase() || '';
      setIncomingFile({ uri: url, fileCopyUri: url, name, type: MIME_MAP[ext] || 'audio/mpeg' });
      setScreen('upload');
    };
    const sub = Linking.addEventListener('url', ({ url }) => handleIncomingUrl(url));
    Linking.getInitialURL().then(url => { if (url) handleIncomingUrl(url); });
    return () => sub.remove();
  }, []);

  const showMiniPlayer = !['player', 'login', 'forgotpassword', 'profile', 'upload'].includes(screen);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.screenArea}>
        {screen === 'player' ? (
          <PlayerScreen
            isCasting={isCasting}
            castIsPlaying={castIsPlaying}
            onCastToggle={castToggle}
          />
        ) : screen === 'playlist' ? (
          <PlaylistScreen onBack={() => setScreen('player')} />
        ) : screen === 'login' ? (
          <LoginScreen
            onBack={() => setScreen('player')}
            onForgotPassword={() => setScreen('forgotpassword')}
          />
        ) : screen === 'forgotpassword' ? (
          <ForgotPasswordScreen onBack={() => setScreen('login')} />
        ) : screen === 'profile' ? (
          <ProfileScreen onBack={() => setScreen('player')} />
        ) : (
          <UploadScreen
            onBack={() => { setIncomingFile(null); setScreen('player'); }}
            incomingFile={incomingFile}
          />
        )}
      </View>

      {['player', 'playlist', 'upload'].includes(screen) && (
        <View style={[styles.profileBtnWrap, { top: insets.top + 8 }]} pointerEvents="box-none">
          <ProfileButton onNavigate={setScreen} />
        </View>
      )}

      {showMiniPlayer && <MiniPlayerBar onPress={() => setScreen('player')} />}

      <ControlBar
        currentScreen={screen}
        navigate={setScreen}
        onSleepPress={() => setSleepModalVisible(true)}
        sleepMinutesLeft={sleepMinutesLeft}
        bottomInset={insets.bottom}
      />

      <SleepTimerModal
        visible={sleepModalVisible}
        onClose={() => setSleepModalVisible(false)}
        onSetTimer={startSleepTimer}
        sleepMinutesLeft={sleepMinutesLeft}
        onCancelTimer={cancelSleepTimer}
      />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#111" />
      <AuthProvider>
        <PlayerProvider>
          <AppContent />
        </PlayerProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#111' },
  screenArea: { flex: 1 },
  profileBtnWrap: { position: 'absolute', right: 16, zIndex: 20 },
});
