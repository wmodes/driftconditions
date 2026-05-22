import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function SubmitScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Submit</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111' },
  text: { color: '#fff', fontSize: 24 },
});
