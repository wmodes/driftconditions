import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import config from '../config';

export default function ForgotPasswordScreen({ onBack }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!email.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(`${config.api.adminServer}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error?.message || 'Something went wrong.');
      }
      setSubmitted(true);
    } catch (err) {
      if (err.name === 'AbortError') {
        setError('Request timed out. Check your connection.');
      } else {
        setError(err.message || 'Something went wrong.');
      }
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

        <Text style={styles.heading}>Reset Password</Text>

        {submitted ? (
          <View style={styles.confirmation}>
            <Text style={styles.confirmIcon}>✉</Text>
            <Text style={styles.confirmHeading}>Check your email</Text>
            <Text style={styles.confirmBody}>
              If an account exists for {email.trim()}, we've sent a reset link. Check your spam folder if it doesn't arrive.
            </Text>
            <TouchableOpacity style={styles.btn} onPress={onBack} activeOpacity={0.8}>
              <Text style={styles.btnText}>Back to Sign In</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.sub}>Enter your email and we'll send a reset link.</Text>

            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor="#555"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              onSubmitEditing={handleSubmit}
              returnKeyType="send"
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Send Reset Link</Text>}
            </TouchableOpacity>
          </>
        )}
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
  confirmation: { alignItems: 'center', gap: 16 },
  confirmIcon: { fontSize: 48 },
  confirmHeading: { color: '#fff', fontSize: 20, fontWeight: '600' },
  confirmBody: { color: '#888', fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
