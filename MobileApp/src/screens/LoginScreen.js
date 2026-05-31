import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

const OAUTH_PROVIDERS = [
  { key: 'google',  label: 'Continue with Google',  color: '#fff', textColor: '#333', borderColor: '#ddd' },
  { key: 'github',  label: 'Continue with GitHub',  color: '#24292e', textColor: '#fff', borderColor: '#24292e' },
  { key: 'discord', label: 'Continue with Discord', color: '#5865F2', textColor: '#fff', borderColor: '#5865F2' },
];

export default function LoginScreen({ onBack, onForgotPassword }) {
  const { signIn, oauthSignIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleOAuth = async (provider) => {
    setError(null);
    try {
      await oauthSignIn(provider);
      // oauthSignIn sets user in context; App.tsx useEffect navigates to player
    } catch (err) {
      setError(err.message || 'OAuth sign in failed');
    }
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
      <View style={styles.navBar}>
        <TouchableOpacity onPress={onBack} style={styles.navSide}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <View style={styles.headingCenter}>
          <View style={styles.headingIcon}>
            <View style={styles.profileHead} />
            <View style={styles.profileBody} />
          </View>
          <Text style={styles.heading}>Sign In</Text>
        </View>
        <View style={styles.navSide} />
      </View>

      <View style={styles.inner}>
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
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  navSide: { minWidth: 70 },
  backText: { color: '#336699', fontSize: 17 },
  headingCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  headingIcon: { alignItems: 'center', justifyContent: 'flex-end', width: 22, height: 26 },
  profileHead: {
    width: 12, height: 12, borderRadius: 6,
    borderWidth: 2, borderColor: '#fff', marginBottom: 2,
  },
  profileBody: {
    width: 20, height: 10,
    borderTopLeftRadius: 10, borderTopRightRadius: 10,
    borderLeftWidth: 2, borderRightWidth: 2, borderTopWidth: 2,
    borderColor: '#fff',
  },
  heading: { color: '#fff', fontSize: 24, fontWeight: '700' },
  inner: { flex: 1, padding: 28, justifyContent: 'center' },
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
