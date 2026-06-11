import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CastContext } from 'react-native-google-cast';
import { usePlayer } from '../context/PlayerContext';
import MoreModal from '../modals/MoreModal';

const ITEMS = [
  { key: 'favorite', label: 'Favorite', icon: '♡' },
  { key: 'sleep',    label: 'Sleep',    icon: '☽' },
  { key: 'playlist', label: 'Playlist', icon: '≡' },
];

export default function ControlBar({ currentScreen, navigate, onSleepPress, sleepMinutesLeft, bottomInset }) {
  const { currentMix, heartedIds, toggleHeart } = usePlayer();
  const isFavorited = currentMix?.mixID ? heartedIds.has(currentMix.mixID) : false;
  const [moreVisible, setMoreVisible] = useState(false);
  const castPendingRef = useRef(false);

  const handlePress = key => {
    switch (key) {
      case 'favorite':
        toggleHeart(currentMix?.mixID);
        break;
      case 'playlist':
        navigate(currentScreen === 'playlist' ? 'player' : 'playlist');
        break;
      case 'sleep':
        onSleepPress();
        break;
      case 'more':
        setMoreVisible(true);
        break;
      default:
        break;
    }
  };

  // Set flag then close modal — onDismiss fires when iOS has fully removed it
  const handleMoreCast = () => {
    castPendingRef.current = true;
    setMoreVisible(false);
  };

  // iOS Modal.onDismiss: guaranteed to fire after modal is gone from view hierarchy
  const handleMoreDismiss = () => {
    if (castPendingRef.current) {
      castPendingRef.current = false;
      CastContext.showCastDialog();
    }
  };

  return (
    <>
    <MoreModal visible={moreVisible} onClose={() => setMoreVisible(false)} onNavigate={navigate} onCastPress={handleMoreCast} onDismiss={handleMoreDismiss} />
    <View style={[styles.bar, { paddingBottom: Math.max(bottomInset || 0, 8) }]}>
      {ITEMS.map(item => {
        const isPlaylistActive = item.key === 'playlist' && currentScreen === 'playlist';
        const isSleepActive = item.key === 'sleep' && sleepMinutesLeft != null;
        const isFavActive = item.key === 'favorite' && isFavorited;
        const active = isPlaylistActive || isSleepActive || isFavActive;
        const color = active ? '#336699' : '#aaa';

        const icon = isSleepActive ? String(sleepMinutesLeft)
          : isFavActive ? '♥'
          : item.icon;
        const label = isSleepActive ? 'min' : item.label;

        return (
          <TouchableOpacity
            key={item.key}
            style={styles.item}
            onPress={() => handlePress(item.key)}
            activeOpacity={0.6}>
            <Text style={[styles.icon, { color }]}>{icon}</Text>
            <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        style={styles.item}
        onPress={() => handlePress('more')}
        activeOpacity={0.6}>
        <Text style={[styles.icon, { color: '#aaa' }]}>…</Text>
        <Text style={styles.label}>More</Text>
      </TouchableOpacity>
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: '#181818',
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
    paddingTop: 10,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: 4,
  },
  icon: { fontSize: 20, marginBottom: 3 },
  label: { color: '#aaa', fontSize: 10 },
  labelActive: { color: '#336699' },
  castIcon: { width: 20, height: 20, marginBottom: 3 },
});
