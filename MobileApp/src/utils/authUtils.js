import * as Keychain from 'react-native-keychain';
import config from '../config';

const SERVICE = 'org.driftconditions.app';

export async function saveToken(token) {
  await Keychain.setGenericPassword('token', token, { service: SERVICE });
}

export async function getToken() {
  const creds = await Keychain.getGenericPassword({ service: SERVICE });
  return creds ? creds.password : null;
}

export async function clearToken() {
  await Keychain.resetGenericPassword({ service: SERVICE });
}

const TIMEOUT_MS = 10000;

function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

// Returns { username, profileComplete } on success, throws on failure
export async function signIn(username, password) {
  const res = await fetchWithTimeout(`${config.api.adminServer}/api/auth/signin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Mobile': 'true',
    },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Sign in failed');
  await saveToken(data.token);
  return { username: data.username, profileComplete: data.profileComplete };
}

export async function signOut() {
  await clearToken();
}

// Returns { authorized, user } or null if not authenticated
export async function checkAuth() {
  const token = await getToken();
  if (!token) return null;
  try {
    const res = await fetchWithTimeout(`${config.api.adminServer}/api/auth/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ context: 'profile' }),
    });
    if (!res.ok) {
      await clearToken();
      return null;
    }
    return res.json();
  } catch {
    return null;
  }
}
