import React, { createContext, useContext, useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { signIn as authSignIn, signOut as authSignOut, checkAuth, saveToken } from '../utils/authUtils';
// checkAuth is used on mount to restore session from Keychain

function parseJwtPayload(token) {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(b64));
  } catch {
    return null;
  }
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  // Check stored token on mount
  useEffect(() => {
    checkAuth()
      .then(data => setUser(data?.user || null))
      .catch(() => setUser(null))
      .finally(() => setAuthReady(true));
  }, []);

  // Handle OAuth deep link — driftconditions://auth?token=<jwt>
  useEffect(() => {
    const handleUrl = async ({ url }) => {
      if (!url?.startsWith('driftconditions://auth')) return;
      const params = new URL(url).searchParams;
      const token = params.get('token');
      const error = params.get('error');
      if (token) {
        await saveToken(token);
        const payload = parseJwtPayload(token);
        setUser({ username: payload?.username || 'User' });
      } else if (error) {
        console.warn('AuthContext: OAuth error:', error);
      }
    };
    const sub = Linking.addEventListener('url', handleUrl);
    // Handle case where app was cold-launched via deep link
    Linking.getInitialURL().then(url => { if (url) handleUrl({ url }); });
    return () => sub.remove();
  }, []);

  const signIn = async (username, password) => {
    const result = await authSignIn(username, password);
    setUser({ username: result.username });
    return result;
  };

  const signOut = async () => {
    await authSignOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, authReady, isAuthenticated: !!user, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
