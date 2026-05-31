import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';

const ICON_COLOR = '#aaa';

function PersonIcon({ color }) {
  return (
    <View style={styles.customIcon}>
      <View style={[styles.profileHead, { borderColor: color }]} />
      <View style={[styles.profileBody, { borderColor: color }]} />
    </View>
  );
}

export default function ProfileModal({ visible, onClose, onNavigate }) {
  const { signOut } = useAuth();

  const handleProfile = () => { onClose(); onNavigate('profile'); };
  const handleSignOut = async () => { onClose(); await signOut(); };

  const ITEMS = [
    {
      key: 'profile',
      label: 'Profile',
      renderIcon: () => <PersonIcon color={ICON_COLOR} />,
      onPress: handleProfile,
    },
    {
      key: 'signout',
      label: 'Sign Out',
      renderIcon: () => <Text style={[styles.textIcon, { color: ICON_COLOR }]}>→</Text>,
      onPress: handleSignOut,
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheet}>
          {ITEMS.map((item, index) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.row, index < ITEMS.length - 1 && styles.rowBorder]}
              onPress={item.onPress}
              activeOpacity={0.7}>
              <View style={styles.iconWrap}>
                {item.renderIcon()}
              </View>
              <Text style={styles.label}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#1e1e1e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 44,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#333' },
  iconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#2e2e2e', alignItems: 'center', justifyContent: 'center', marginRight: 16,
  },
  label: { color: '#fff', fontSize: 16 },
  textIcon: { fontSize: 18, fontWeight: '600' },
  customIcon: { alignItems: 'center', justifyContent: 'center' },
  profileHead: { width: 9, height: 9, borderRadius: 5, borderWidth: 1.5, marginBottom: 2 },
  profileBody: {
    width: 17, height: 9,
    borderTopLeftRadius: 9, borderTopRightRadius: 9,
    borderLeftWidth: 1.5, borderRightWidth: 1.5, borderTopWidth: 1.5, borderBottomWidth: 0,
  },
});
