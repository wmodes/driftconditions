import React, { useState, useEffect, useRef } from 'react';
import { View, StatusBar, StyleSheet } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import TrackPlayer from 'react-native-track-player';

import { PlayerProvider } from './src/context/PlayerContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import PlayerScreen from './src/screens/PlayerScreen';
import PlaylistScreen from './src/screens/PlaylistScreen';
import LoginScreen from './src/screens/LoginScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ControlBar from './src/components/ControlBar';
import MiniPlayerBar from './src/components/MiniPlayerBar';
import SleepTimerModal from './src/modals/SleepTimerModal';

type Screen = 'player' | 'playlist' | 'login' | 'forgotpassword' | 'profile';

function AppContent() {
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState<Screen>('player');
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

  // Navigate to player after OAuth or any async sign-in completes
  useEffect(() => {
    if (isAuthenticated && (screen === 'login' || screen === 'forgotpassword')) {
      setScreen('player');
    }
  }, [isAuthenticated, screen]);

  const showMiniPlayer = screen !== 'player' && screen !== 'login' && screen !== 'forgotpassword' && screen !== 'profile';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.screenArea}>
        {screen === 'player' ? (
          <PlayerScreen />
        ) : screen === 'playlist' ? (
          <PlaylistScreen onBack={() => setScreen('player')} />
        ) : screen === 'login' ? (
          <LoginScreen
            onBack={() => setScreen('player')}
            onForgotPassword={() => setScreen('forgotpassword')}
          />
        ) : screen === 'forgotpassword' ? (
          <ForgotPasswordScreen onBack={() => setScreen('login')} />
        ) : (
          <ProfileScreen onBack={() => setScreen('player')} />
        )}
      </View>

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
});
