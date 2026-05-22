import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';

const PRESETS = [15, 30, 45, 60];

export default function SleepTimerModal({
  visible,
  onClose,
  onSetTimer,
  sleepMinutesLeft,
  onCancelTimer,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheet}>
          <Text style={styles.heading}>Sleep Timer</Text>

          {sleepMinutesLeft != null ? (
            <View style={styles.activeState}>
              <Text style={styles.activeIcon}>☽</Text>
              <Text style={styles.activeText}>Stops in {sleepMinutesLeft} min</Text>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { onCancelTimer(); onClose(); }}>
                <Text style={styles.cancelText}>Cancel Timer</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.presets}>
              {PRESETS.map(min => (
                <TouchableOpacity
                  key={min}
                  style={styles.preset}
                  onPress={() => onSetTimer(min)}
                  activeOpacity={0.7}>
                  <Text style={styles.presetNum}>{min}</Text>
                  <Text style={styles.presetUnit}>min</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
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
    padding: 28,
    paddingBottom: 44,
  },
  heading: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 28,
  },
  presets: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  preset: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: '#336699',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetNum: { color: '#fff', fontSize: 22, fontWeight: '600' },
  presetUnit: { color: '#888', fontSize: 11 },
  activeState: { alignItems: 'center', gap: 16 },
  activeIcon: { fontSize: 36, color: '#336699' },
  activeText: { color: '#ccc', fontSize: 16 },
  cancelBtn: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#555',
  },
  cancelText: { color: '#aaa', fontSize: 14 },
});
