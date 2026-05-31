import React, { useEffect, useState } from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity,
  ActivityIndicator, StyleSheet, Linking,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getToken } from '../utils/authUtils';
import config from '../config';

const TOP_PLAYS_MAX = 5;

function formatMonthYear(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
}

function trimProtocol(url) {
  if (!url) return url;
  return url.replace(/^(https?:\/\/)/, '');
}

function StatRow({ label, value }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function SectionHeader({ title }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

export default function ProfileScreen({ onBack }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchProfile() {
      try {
        const token = await getToken();
        const res = await fetch(`${config.api.adminServer}/api/user/profile`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ username: user?.username }),
        });
        const json = await res.json();
        if (!cancelled) {
          if (res.ok && json.data) {
            setProfile(json.data);
          } else {
            setError('Could not load profile.');
          }
        }
      } catch (err) {
        if (!cancelled) setError('Could not load profile.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchProfile();
    return () => { cancelled = true; };
  }, [user?.username]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#336699" size="large" />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || 'Profile unavailable.'}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const stats = profile.stats || {};
  const audioStats = stats.audio || {};
  const recipeStats = stats.recipes || {};
  const generalStats = stats.general || {};
  const topPlays = audioStats.topPlays || [];
  const recentPlayed = audioStats.recentPlayed || [];

  return (
    <View style={styles.root}>
      <TouchableOpacity style={styles.backBtn} onPress={onBack}>
        <Text style={styles.backText}>‹ Back</Text>
      </TouchableOpacity>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Avatar + name */}
        <View style={styles.avatarRow}>
          {profile.avatar_url ? (
            <Image
              source={{ uri: profile.avatar_url }}
              style={styles.avatar}
              referrerPolicy="no-referrer"
            />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarFallbackText}>
                {(profile.firstname?.[0] || profile.username?.[0] || '?').toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.nameBlock}>
            {(profile.firstname || profile.lastname) && (
              <Text style={styles.fullName}>
                {[profile.firstname, profile.lastname].filter(Boolean).join(' ')}
              </Text>
            )}
            <Text style={styles.username}>@{profile.username}</Text>
          </View>
        </View>

        {/* Bio */}
        {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

        {/* Location / email / url */}
        {profile.location ? (
          <Text style={styles.metaLine}>📍 {profile.location}</Text>
        ) : null}
        {profile.email ? (
          <TouchableOpacity onPress={() => Linking.openURL(`mailto:${profile.email}`)}>
            <Text style={[styles.metaLine, styles.link]}>✉ {profile.email}</Text>
          </TouchableOpacity>
        ) : null}
        {profile.url ? (
          <TouchableOpacity onPress={() => Linking.openURL(profile.url)}>
            <Text style={[styles.metaLine, styles.link]}>🔗 {trimProtocol(profile.url)}</Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.divider} />

        {/* Member meta */}
        {profile.addedOn ? (
          <Text style={styles.memberMeta}>Member since {formatMonthYear(profile.addedOn)}</Text>
        ) : null}
        {generalStats.lastContributed ? (
          <Text style={styles.memberMeta}>Last contributed {formatMonthYear(generalStats.lastContributed)}</Text>
        ) : null}
        {audioStats.totalPlays > 0 ? (
          <Text style={styles.memberMeta}>{audioStats.totalPlays} total plays</Text>
        ) : null}
        {(profile.roleNameShow || profile.roleName) ? (
          <Text style={styles.memberMeta}>
            Role: <Text style={styles.italic}>{profile.roleNameShow || profile.roleName}</Text>
          </Text>
        ) : null}

        <View style={styles.divider} />

        {/* Audio stats */}
        <SectionHeader title="Audio" />
        <StatRow label="Contributed" value={audioStats.contributed ?? 0} />
        {audioStats.pending > 0 && (
          <StatRow label="Waiting for approval" value={audioStats.pending} />
        )}

        {/* Recipe stats */}
        {(recipeStats.contributed > 0) && (
          <>
            <View style={styles.divider} />
            <SectionHeader title="Recipes" />
            <StatRow label="Contributed" value={recipeStats.contributed} />
            {recipeStats.pending > 0 && (
              <StatRow label="Waiting for approval" value={recipeStats.pending} />
            )}
          </>
        )}

        {/* Top played */}
        {topPlays.length > 0 && (
          <>
            <View style={styles.divider} />
            <SectionHeader title="Top Played Audio" />
            {topPlays.slice(0, TOP_PLAYS_MAX).map((clip) => (
              <View key={clip.audioID} style={styles.clipRow}>
                <Text style={styles.clipTitle} numberOfLines={1}>{clip.title}</Text>
                <Text style={styles.clipCount}>{clip.timesUsed}×</Text>
              </View>
            ))}
          </>
        )}

        {/* Recently played */}
        {recentPlayed.length > 0 && (
          <>
            <View style={styles.divider} />
            <SectionHeader title="Recently Played Audio" />
            {recentPlayed.map((clip) => (
              <View key={clip.audioID} style={styles.clipRow}>
                <Text style={styles.clipTitle} numberOfLines={1}>{clip.title}</Text>
              </View>
            ))}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#111' },
  centered: { flex: 1, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#888', fontSize: 15, marginBottom: 20 },

  backBtn: { position: 'absolute', top: 16, left: 20, zIndex: 10 },
  backText: { color: '#336699', fontSize: 17 },

  scroll: { flex: 1 },
  scrollContent: { paddingTop: 60, paddingHorizontal: 24 },

  // Avatar + name
  avatarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatar: { width: 72, height: 72, borderRadius: 36, marginRight: 16 },
  avatarFallback: { backgroundColor: '#2a2a2a', alignItems: 'center', justifyContent: 'center' },
  avatarFallbackText: { color: '#aaa', fontSize: 28, fontWeight: '600' },
  nameBlock: { flex: 1 },
  fullName: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 2 },
  username: { color: '#666', fontSize: 14 },

  bio: { color: '#ccc', fontSize: 15, lineHeight: 22, marginBottom: 14 },

  metaLine: { color: '#aaa', fontSize: 14, marginBottom: 6 },
  link: { color: '#336699' },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#2a2a2a', marginVertical: 16 },

  memberMeta: { color: '#777', fontSize: 13, marginBottom: 4 },
  italic: { fontStyle: 'italic' },

  sectionHeader: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 10 },

  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  statLabel: { color: '#aaa', fontSize: 14 },
  statValue: { color: '#fff', fontSize: 14, fontWeight: '500' },

  clipRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' },
  clipTitle: { color: '#ccc', fontSize: 14, flex: 1, marginRight: 8 },
  clipCount: { color: '#666', fontSize: 13 },
});
