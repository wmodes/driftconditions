import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Linking,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import config from '../config';

const OAUTH_PROVIDERS = [
  { key: 'google',  label: 'Continue with Google',  color: '#fff', textColor: '#333', borderColor: '#ddd' },
  { key: 'github',  label: 'Continue with GitHub',  color: '#24292e', textColor: '#fff', borderColor: '#24292e' },
  { key: 'discord', label: 'Continue with Discord', color: '#5865F2', textColor: '#fff', borderColor: '#5865F2' },
];

export default function LoginScreen({ onBack, onForgotPassword }) {
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleOAuth = (provider) => {
    Linking.openURL(`${config.api.adminServer}/api/auth/${provider}?mobile=true`);
  };

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

        {OAUTH_PROVIDERS.map(p => (
          <TouchableOpacity
            key={p.key}
            style={[styles.oauthBtn, { backgroundColor: p.color, borderColor: p.borderColor }]}
            onPress={() => handleOAuth(p.key)}
            activeOpacity={0.8}>
            <Text style={[styles.oauthBtnText, { color: p.textColor }]}>{p.label}</Text>
          </TouchableOpacity>
        ))}

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

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

        <TouchableOpacity style={styles.forgotBtn} onPress={onForgotPassword} activeOpacity={0.7}>
          <Text style={styles.forgotText}>Forgot password?</Text>
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
  forgotBtn: { alignItems: 'center', marginTop: 20 },
  forgotText: { color: '#336699', fontSize: 14 },
  oauthBtn: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
  },
  oauthBtnText: { fontSize: 15, fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: '#333' },
  dividerText: { color: '#555', fontSize: 13, marginHorizontal: 12 },
});
