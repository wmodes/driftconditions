import React, { createContext, useContext, useEffect, useState } from 'react';
import { signIn as authSignIn, signOut as authSignOut, checkAuth } from '../utils/authUtils';
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
