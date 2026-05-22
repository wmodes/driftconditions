import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { usePlayer } from '../context/PlayerContext';

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function PlaylistScreen({ onBack }) {
  const { mixList, currentMix, loadPlaylist, heartedIds, toggleHeart } = usePlayer();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPlaylist();
    setRefreshing(false);
  }, [loadPlaylist]);

  const sections = useMemo(() => {
    return mixList.map(mix => {
      let clips = mix.playlist || [];
      if (!Array.isArray(clips)) clips = clips.playlist || [];
      return {
        mix,
        isCurrentMix: mix.mixID === currentMix?.mixID,
        clips,
      };
    });
  }, [mixList, currentMix]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.headerBtn}>
          <Text style={styles.backIcon}>◀</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>playlist</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        style={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#336699" />
        }>
        {sections.length === 0 && (
          <Text style={styles.empty}>Loading playlist…</Text>
        )}

        {sections.map((section, sIdx) => {
          const { mix, isCurrentMix, clips } = section;
          const coverUri = mix.coverImage
            ? `https://driftconditions.org/${mix.coverImage}`
            : null;

          return (
            <View key={mix.mixID ?? sIdx}>
              <View style={[styles.mixRow, isCurrentMix && styles.mixRowActive]}>
                {/* Timestamp + heart stacked */}
                <View style={styles.metaCol}>
                  <Text style={styles.timestamp}>{formatTime(mix.dateUsed)}</Text>
                  <TouchableOpacity
                    style={styles.heartBtn}
                    onPress={() => toggleHeart(mix.mixID)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={[styles.heart, (isCurrentMix || heartedIds.has(mix.mixID)) && styles.heartActive]}>
                      {heartedIds.has(mix.mixID) ? '♥' : '♡'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Thumbnail */}
                {coverUri ? (
                  <Image source={{ uri: coverUri }} style={styles.thumb} resizeMode="cover" />
                ) : (
                  <View style={[styles.thumb, styles.thumbPlaceholder]} />
                )}

                {/* Clip titles column */}
                <View style={styles.clipCol}>
                  {isCurrentMix && (
                    <Text style={styles.nowPlaying}>NOW PLAYING</Text>
                  )}
                  {clips.map((clip, cIdx) => (
                    <Text
                      key={clip.audioID ?? cIdx}
                      style={styles.clipTitle}
                      numberOfLines={1}
                      ellipsizeMode="tail">
                      {clip.title || clip.filename || 'Untitled'}
                    </Text>
                  ))}
                </View>
              </View>
              <View style={styles.divider} />
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  list: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  headerBtn: { width: 40 },
  backIcon: { color: '#336699', fontSize: 18 },
  headerTitle: {
    flex: 1,
    color: '#bbb',
    fontSize: 18,
    fontWeight: '300',
    letterSpacing: 1,
    textAlign: 'center',
  },

  mixRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#111',
  },
  mixRowActive: { backgroundColor: '#0d1d2a' },

  metaCol: {
    alignItems: 'center',
    width: 46,
    marginRight: 6,
    paddingTop: 2,
  },
  timestamp: { color: '#555', fontSize: 11, marginBottom: 5 },
  heartBtn: {},
  heart: { color: '#444', fontSize: 16 },
  heartActive: { color: '#336699' },

  thumb: { width: 44, height: 44, borderRadius: 4, marginRight: 10 },
  thumbPlaceholder: { backgroundColor: '#1e2d3d' },

  clipCol: { flex: 1, paddingTop: 2 },
  nowPlaying: {
    color: '#336699',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 3,
  },
  clipTitle: { color: '#ccc', fontSize: 13, lineHeight: 20 },

  divider: { height: 1, backgroundColor: '#1e1e1e' },

  empty: { color: '#555', textAlign: 'center', padding: 32, fontSize: 14 },
});
