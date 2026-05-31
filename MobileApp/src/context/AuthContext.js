import React, { createContext, useContext, useEffect, useState } from 'react';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import { signIn as authSignIn, signOut as authSignOut, checkAuth, saveToken, clearToken } from '../utils/authUtils';
import config from '../config';
// checkAuth is used on mount to restore session from Keychain

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

  const signIn = async (username, password) => {
    const result = await authSignIn(username, password);
    setUser({ username: result.username });
    return result;
  };

  const oauthSignIn = async (provider) => {
    const url = `${config.api.adminServer}/api/auth/${provider}?mobile=true`;
    const redirectUrl = 'driftconditions://auth';
    try {
      if (await InAppBrowser.isAvailable()) {
        const result = await InAppBrowser.openAuth(url, redirectUrl, {
          ephemeralWebSession: false, // share cookies so provider stays logged in
          showTitle: false,
          enableUrlBarHiding: true,
          enableDefaultShare: false,
        });
        if (result.type === 'success' && result.url) {
          const token = decodeURIComponent(result.url.match(/[?&]token=([^&]+)/)?.[1] || '')  || null;
          const error = result.url.match(/[?&]error=([^&]+)/)?.[1];
          if (token) {
            await saveToken(token);
            // Use the token in-hand rather than re-reading from Keychain (avoids
            // timing issues on real devices where Keychain writes aren't instant)
            const res = await fetch(`${config.api.adminServer}/api/auth/check`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({ context: 'profile' }),
            });
            const data = res.ok ? await res.json() : null;
            if (data?.user) {
              setUser(data.user);
            } else {
              await clearToken();
              throw new Error('Sign in succeeded but could not verify session');
            }
          } else if (error) {
            throw new Error(decodeURIComponent(error));
          }
        }
        // result.type === 'cancel' means user dismissed — no-op
      }
    } catch (err) {
      console.warn('AuthContext: oauthSignIn error:', err);
      throw err;
    }
  };

  const signOut = async () => {
    await authSignOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, authReady, isAuthenticated: !!user, signIn, oauthSignIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
