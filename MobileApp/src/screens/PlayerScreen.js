import React, { useMemo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { usePlayer } from '../context/PlayerContext';

const { width } = Dimensions.get('window');
const COVER_SIZE = width * 0.78;

export default function PlayerScreen({ isCasting, castIsPlaying, onCastToggle }) {
  const { isPlaying, isLoading, currentMix, toggle } = usePlayer();

  const playing = isCasting ? castIsPlaying : isPlaying;
  const loading = isCasting ? false : isLoading;
  const handleToggle = isCasting ? onCastToggle : toggle;

  const coverUri = currentMix?.coverImage
    ? `https://driftconditions.org/${currentMix.coverImage}`
    : null;

  const clips = useMemo(() => {
    let c = currentMix?.playlist || [];
    if (!Array.isArray(c)) c = c.playlist || [];
    return c.slice(0, 6);
  }, [currentMix]);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {coverUri ? (
          <Image source={{ uri: coverUri }} style={styles.cover} resizeMode="cover" />
        ) : (
          <View style={[styles.cover, styles.coverPlaceholder]} />
        )}

        <View style={styles.clipList}>
          {clips.length > 0 ? clips.map((clip, i) => (
            <Text key={clip.audioID ?? i} style={styles.clipTitle} numberOfLines={1} ellipsizeMode="tail">
              {clip.title || clip.filename || 'Untitled'}
            </Text>
          )) : (
            <Text style={styles.logotype}>DriftConditions</Text>
          )}
        </View>

        {isCasting && (
          <Text style={styles.castingLabel}>Casting ⬡</Text>
        )}

        {loading ? (
          <ActivityIndicator size="large" color="#336699" style={styles.loader} />
        ) : (
          <TouchableOpacity onPress={handleToggle} activeOpacity={0.8}>
            <View style={styles.playCircle}>
              {playing ? (
                <View style={styles.pauseBars}>
                  <View style={styles.pauseBar} />
                  <View style={styles.pauseBar} />
                </View>
              ) : (
                <Text style={styles.playIcon}>▶</Text>
              )}
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
    paddingHorizontal: 24,
  },
  card: {
    alignItems: 'center',
    width: '100%',
  },
  cover: {
    width: COVER_SIZE,
    height: COVER_SIZE,
    borderRadius: 16,
    marginBottom: 24,
  },
  coverPlaceholder: { backgroundColor: '#1e2d3d' },
  clipList: {
    width: '100%',
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  clipTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 26,
  },
  logotype: {
    color: '#fff',
    fontSize: 28,
    fontFamily: 'RubikDistressed-Regular',
    textAlign: 'center',
  },
  loader: { height: 72 },
  castingLabel: { color: '#336699', fontSize: 13, textAlign: 'center', marginBottom: 8 },
  pauseBars: { flexDirection: 'row', gap: 5 },
  pauseBar: { width: 4, height: 22, backgroundColor: '#fff', borderRadius: 2 },
  playCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#336699',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { color: '#fff', fontSize: 26, paddingLeft: 4 },
});
