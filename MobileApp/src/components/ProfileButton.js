import React, { useEffect, useState } from 'react';
import { TouchableOpacity, Image, View, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getToken } from '../utils/authUtils';
import config from '../config';
import ProfileModal from '../modals/ProfileModal';

function PersonIcon({ size, color }) {
  const headSize = size * 0.38;
  const bodyW = size * 0.56;
  const bodyH = size * 0.28;
  return (
    <View style={{ alignItems: 'center', justifyContent: 'flex-end', width: size, height: size }}>
      <View style={{
        width: headSize, height: headSize, borderRadius: headSize / 2,
        borderWidth: 1.5, borderColor: color, marginBottom: 2,
      }} />
      <View style={{
        width: bodyW, height: bodyH,
        borderTopLeftRadius: bodyH, borderTopRightRadius: bodyH,
        borderLeftWidth: 1.5, borderRightWidth: 1.5, borderTopWidth: 1.5,
        borderColor: color,
      }} />
    </View>
  );
}

export default function ProfileButton({ onNavigate, size = 40 }) {
  const { user, isAuthenticated } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user?.username) { setAvatarUrl(null); return; }
    let cancelled = false;
    async function fetchAvatar() {
      try {
        const token = await getToken();
        const res = await fetch(`${config.api.adminServer}/api/user/profile`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ username: user.username }),
        });
        const json = res.ok ? await res.json() : null;
        if (!cancelled) setAvatarUrl(json?.data?.avatar_url || null);
      } catch { /* no avatar, show icon */ }
    }
    fetchAvatar();
    return () => { cancelled = true; };
  }, [user?.username, isAuthenticated]);

  const handlePress = () => {
    if (!isAuthenticated) { onNavigate('login'); return; }
    setMenuVisible(true);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.btn, { width: size, height: size, borderRadius: size / 2 }]}
        onPress={handlePress}
        activeOpacity={0.7}>
        {isAuthenticated && avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={{ width: size, height: size, borderRadius: size / 2 }}
            resizeMode="cover"
          />
        ) : (
          <PersonIcon
            size={size * 0.65}
            color={isAuthenticated ? '#fff' : '#666'}
          />
        )}
      </TouchableOpacity>
      <ProfileModal
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNavigate={onNavigate}
      />
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: '#1e1e1e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
  },
});
