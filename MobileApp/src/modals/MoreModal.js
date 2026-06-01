import React from 'react';
import { View, Text, TouchableOpacity, Modal, Share, StyleSheet } from 'react-native';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { NativeModules } from 'react-native';

function ShareIcon({ color }) {
  return (
    <View style={styles.customIcon}>
      <Text style={[styles.shareArrow, { color }]}>↑</Text>
      <View style={[styles.shareBox, { borderColor: color }]} />
    </View>
  );
}

const ICON_COLOR = '#aaa';

export default function MoreModal({ visible, onClose, onNavigate }) {
  const { displayTitle } = usePlayer();
  const { isAuthenticated } = useAuth();

  const handleAirPlay = () => {
    onClose();
    try {
      NativeModules.RNAirplayRouter.showRoutePicker();
    } catch (e) {
      console.warn('AirPlay unavailable:', e.message);
    }
  };

  const handleShare = () => {
    onClose();
    Share.share({
      message: `Listening to "${displayTitle || 'DriftConditions'}" — https://driftconditions.org`,
      url: 'https://driftconditions.org',
      title: 'DriftConditions',
    });
  };

  const handleUpload = () => {
    onClose();
    onNavigate('upload');
  };

  const ITEMS = [
    {
      key: 'airplay',
      label: 'AirPlay',
      renderIcon: () => <Text style={[styles.textIcon, { color: ICON_COLOR }]}>▲</Text>,
      onPress: handleAirPlay,
    },
    {
      key: 'share',
      label: 'Share',
      renderIcon: () => <ShareIcon color={ICON_COLOR} />,
      onPress: handleShare,
    },
    ...(isAuthenticated ? [{
      key: 'upload',
      label: 'Upload Audio',
      renderIcon: () => <Text style={[styles.textIcon, { color: ICON_COLOR }]}>↑</Text>,
      onPress: handleUpload,
    }] : []),
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheet}>
          <Text style={styles.heading}>MORE ACTIONS</Text>

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
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1e1e1e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 44,
  },
  heading: {
    color: '#666',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    marginLeft: 20,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#333',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2e2e2e',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  label: {
    color: '#fff',
    fontSize: 16,
  },

  textIcon: { fontSize: 18, fontWeight: '600' },

  customIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Share icon: up arrow + open-top box
  shareArrow: {
    fontSize: 13,
    lineHeight: 13,
    marginBottom: 1,
  },
  shareBox: {
    width: 14,
    height: 9,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderBottomWidth: 1.5,
    borderTopWidth: 0,
  },
});
