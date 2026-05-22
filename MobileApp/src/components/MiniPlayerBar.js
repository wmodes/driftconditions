import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { usePlayer } from '../context/PlayerContext';

export default function MiniPlayerBar({ onPress }) {
  const { isPlaying, toggle, currentMix, displayTitle } = usePlayer();

  // Static indicator: dot near left when paused, center when playing
  const pct = isPlaying ? 0.5 : 0.1;

  const coverUri = currentMix?.coverImage
    ? `https://driftconditions.org/${currentMix.coverImage}`
    : null;

  return (
    <View style={styles.bar}>
      <TouchableOpacity style={styles.infoArea} onPress={onPress} activeOpacity={0.7}>
        {coverUri ? (
          <Image source={{ uri: coverUri }} style={styles.cover} resizeMode="cover" />
        ) : (
          <View style={[styles.cover, styles.coverPlaceholder]} />
        )}
        <View style={styles.textArea}>
          <Text style={styles.title} numberOfLines={1}>
            {displayTitle || 'DriftConditions'}
          </Text>
          {/* State indicator: dot at left = paused, dot at center = playing */}
          <View style={[styles.progressBar, isPlaying && styles.progressBarPlaying]}>
            <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
            <View style={[styles.playhead, { left: `${pct * 100}%` }]} />
          </View>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.playBtn} onPress={toggle} activeOpacity={0.7}>
        <View style={styles.playCircle}>
          {isPlaying ? (
            <View style={styles.pauseBars}>
              <View style={styles.pauseBar} />
              <View style={styles.pauseBar} />
            </View>
          ) : (
            <Text style={styles.playIcon}>▶</Text>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    height: 64,
  },
  infoArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cover: {
    width: 48,
    height: 48,
    borderRadius: 4,
    marginRight: 12,
  },
  coverPlaceholder: { backgroundColor: '#1e2d3d' },
  textArea: { flex: 1, justifyContent: 'center' },
  title: { color: '#ddd', fontSize: 14, fontWeight: '500', marginBottom: 8 },

  progressBar: {
    height: 3,
    backgroundColor: '#555',
    borderRadius: 1.5,
    marginRight: 4,
    position: 'relative',
  },
  progressBarPlaying: { backgroundColor: '#333' },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: 3,
    backgroundColor: '#336699',
    borderRadius: 1.5,
  },
  playhead: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#fff',
    top: -3,
    marginLeft: -4.5,
  },

  pauseBars: { flexDirection: 'row', gap: 4 },
  pauseBar: { width: 3, height: 14, backgroundColor: '#fff', borderRadius: 1.5 },
  playBtn: { marginLeft: 12 },
  playCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#336699',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { color: '#fff', fontSize: 16, paddingLeft: 2 },
});
