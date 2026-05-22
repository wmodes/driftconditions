import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ onBack }) {
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!username.trim() || !password) return;
    setError(null);
    setLoading(true);
    try {
      await signIn(username.trim(), password);
      onBack(); // return to previous screen on success
    } catch (err) {
      setError(err.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>

        <Text style={styles.heading}>Sign In</Text>
        <Text style={styles.sub}>Use your DriftConditions account</Text>

        <TextInput
          style={styles.input}
          placeholder="Username or email"
          placeholderTextColor="#555"
          autoCapitalize="none"
          autoCorrect={false}
          value={username}
          onChangeText={setUsername}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#555"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={handleSignIn}
          returnKeyType="go"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleSignIn}
          disabled={loading}
          activeOpacity={0.8}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Sign In</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#111' },
  inner: { flex: 1, padding: 28, justifyContent: 'center' },
  backBtn: { position: 'absolute', top: 16, left: 20 },
  backText: { color: '#336699', fontSize: 17 },
  heading: { color: '#fff', fontSize: 28, fontWeight: '700', marginBottom: 6 },
  sub: { color: '#666', fontSize: 14, marginBottom: 32 },
  input: {
    backgroundColor: '#1e1e1e',
    color: '#fff',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  error: { color: '#c0392b', fontSize: 13, marginBottom: 12 },
  btn: {
    backgroundColor: '#336699',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
