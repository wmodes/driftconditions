import React from 'react';
import { View, Text, TouchableOpacity, Modal, Share, StyleSheet, NativeModules } from 'react-native';
import { Svg, Path } from 'react-native-svg';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';

// SVG icon components — paths from graphic/ directory
function CastIcon({ color }) {
  return (
    <Svg viewBox="0 0 24 24" width={20} height={20}>
      <Path fill={color} d="M0 18.5455v3.2727h3.2727c0-1.811-1.4618-3.2727-3.2727-3.2727zm0-4.3637v2.1818c3.011 0 5.4545 2.4437 5.4545 5.4546h2.1819c0-4.2218-3.4146-7.6364-7.6364-7.6364zm0-4.3636V12c5.4218 0 9.8182 4.3964 9.8182 9.8182H12c0-6.6327-5.3782-12-12-12zm21.8182-7.6364H2.1818C.9818 2.1818 0 3.1636 0 4.3636v3.2728h2.1818V4.3636h19.6364v15.2728h-7.6364v2.1818h7.6364c1.2 0 2.1818-.9818 2.1818-2.1818V4.3636c0-1.2-.9818-2.1818-2.1818-2.1818Z" />
    </Svg>
  );
}

function AirPlayIcon({ color }) {
  return (
    <Svg viewBox="0 0 24 24" width={20} height={20}>
      <Path fill={color} d="M3.412 1.32c-1.178 0-1.584.122-2.031.366A2.449 2.449 0 00.365 2.7C.122 3.148 0 3.553 0 4.771v9.137c0 1.178.122 1.585.365 2.031.244.447.57.772 1.016 1.016.406.244.813.365 2.031.365h2.72l1.138-1.34H3.006c-.325.041-.69-.001-1.016-.164-.203-.08-.366-.283-.488-.486-.122-.325-.203-.65-.162-1.016V4.406c-.04-.325 0-.69.162-1.015.081-.203.285-.365.488-.487.325-.122.65-.204 1.016-.164h17.867c.325-.04.69.002 1.016.164.203.082.364.284.486.487.122.324.203.65.162 1.015v9.95c.04.324 0 .69-.162 1.015-.081.203-.283.365-.486.486-.325.122-.65.203-1.016.163h-4.264l1.137 1.341 2.803-.04c1.218 0 1.623-.122 2.07-.366a2.449 2.449 0 001.016-1.016c.243-.406.365-.813.365-2.03V4.77c0-1.218-.122-1.623-.365-2.07a2.449 2.449 0 00-1.016-1.015c-.447-.244-.852-.366-2.07-.366H3.412zm8.451 12.198a.501.501 0 00-.37.187l-7.106 8.162a.465.465 0 00-.123.326.47.47 0 00.488.487h14.293c.122 0 .245-.04.326-.121.203-.163.204-.489.041-.692l-7.107-8.162-.041-.04a.594.594 0 00-.4-.147z" />
    </Svg>
  );
}

function ShareIcon({ color }) {
  return (
    <Svg viewBox="0 0 24 24" width={20} height={20}>
      <Path stroke={color} strokeWidth={1.5} fill="none" d="M9 12c0 1.3807-1.11929 2.5-2.5 2.5S4 13.3807 4 12s1.11929-2.5 2.5-2.5S9 10.6193 9 12Z" />
      <Path stroke={color} strokeWidth={1.5} strokeLinecap="round" fill="none" d="M14 6.5 9 10" />
      <Path stroke={color} strokeWidth={1.5} strokeLinecap="round" fill="none" d="M14 17.5 9 14" />
      <Path stroke={color} strokeWidth={1.5} fill="none" d="M19 18.5c0 1.3807-1.1193 2.5-2.5 2.5S14 19.8807 14 18.5s1.1193-2.5 2.5-2.5 2.5 1.1193 2.5 2.5Z" />
      <Path stroke={color} strokeWidth={1.5} fill="none" d="M19 5.5C19 6.88071 17.8807 8 16.5 8S14 6.88071 14 5.5 15.1193 3 16.5 3 19 4.11929 19 5.5Z" />
    </Svg>
  );
}

const ICON_COLOR = '#aaa';

export default function MoreModal({ visible, onClose, onNavigate, onCastPress, onDismiss }) {
  const { displayTitle } = usePlayer();
  const { isAuthenticated } = useAuth();

  const handleCast = () => {
    onClose();
    onCastPress();
  };

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
      key: 'cast',
      label: 'Cast',
      renderIcon: () => <CastIcon color={ICON_COLOR} />,
      onPress: handleCast,
    },
    {
      key: 'airplay',
      label: 'AirPlay',
      renderIcon: () => <AirPlayIcon color={ICON_COLOR} />,
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
      onRequestClose={onClose}
      onDismiss={onDismiss}>
      {/* Backdrop and sheet are siblings — sheet is not inside the TouchableOpacity
          so native components (CastButton) receive touches unobstructed */}
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
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

});
