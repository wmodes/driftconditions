/**
 * @file heartUtils.js - AsyncStorage heart management for mix favorites.
 * Mirrors the web app's heartUtils.js — same storage format, same 48h TTL.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import config from '../config';
import { getToken } from './authUtils';

const STORAGE_KEY = 'dc_hearts';
const MAX_AGE_MS = 48 * 60 * 60 * 1000; // 48 hours, matching web app

const getHearts = async () => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveHearts = async (hearts) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(hearts));
  } catch (err) {
    console.warn('heartUtils: failed to save', err);
  }
};

/** Remove entries older than 48h. Called on load and every heart action. */
const pruneAndSave = async () => {
  const hearts = await getHearts();
  const cutoff = Date.now() - MAX_AGE_MS;
  const pruned = Object.fromEntries(
    Object.entries(hearts).filter(([, ts]) => ts > cutoff)
  );
  await saveHearts(pruned);
  return pruned;
};

/** Load persisted hearts, prune stale entries, return a Set of mixIDs. */
export const loadHearts = async () => {
  const hearts = await pruneAndSave();
  return new Set(Object.keys(hearts).map(Number));
};

/**
 * Toggle heart for a mixID. Prunes stale entries, persists, syncs to server.
 * Returns the new hearted boolean.
 */
export const toggleHeart = async (mixID) => {
  const hearts = await pruneAndSave();
  const key = String(mixID);
  const nowHearted = !Object.prototype.hasOwnProperty.call(hearts, key);

  if (nowHearted) {
    hearts[key] = Date.now();
  } else {
    delete hearts[key];
  }
  await saveHearts(hearts);

  try {
    const token = await getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    await fetch(`${config.api.mixEngine}/api/queue/heart`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ mixID, hearted: nowHearted }),
    });
  } catch (err) {
    console.warn('heartUtils: failed to sync with server', err);
  }

  return nowHearted;
};
