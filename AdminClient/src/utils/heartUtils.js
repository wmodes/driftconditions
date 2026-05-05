/**
 * @file heartUtils.js - localStorage heart management for mix favorites.
 */

import config from '../config/config';
import axios from 'axios';

const STORAGE_KEY = 'dc_hearts';
const maxAgeMs = config.heart.maxAgeHours * 60 * 60 * 1000;
const heartRoute = config.mixEngine.baseURL + config.mixEngine.routes.heartMix;

/** Return the full hearts map from localStorage: { [mixID]: timestamp } */
const getHearts = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
};

const saveHearts = (hearts) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(hearts));
};

/** Remove entries older than maxAgeHours. Call on every heart action. */
export const pruneHearts = () => {
  const hearts = getHearts();
  const cutoff = Date.now() - maxAgeMs;
  const pruned = Object.fromEntries(
    Object.entries(hearts).filter(([, ts]) => ts > cutoff)
  );
  saveHearts(pruned);
};

/** Returns true if the given mixID is in localStorage hearts. */
export const isHearted = (mixID) => {
  const hearts = getHearts();
  return Object.prototype.hasOwnProperty.call(hearts, String(mixID));
};

/**
 * Toggle heart state for a mix. Prunes stale entries, updates localStorage,
 * and fires the backend request. Returns the new hearted state.
 */
export const toggleHeart = async (mixID) => {
  pruneHearts();
  const hearts = getHearts();
  const key = String(mixID);
  const nowHearted = !Object.prototype.hasOwnProperty.call(hearts, key);

  if (nowHearted) {
    hearts[key] = Date.now();
  } else {
    delete hearts[key];
  }
  saveHearts(hearts);

  try {
    await axios.post(heartRoute, { mixID, hearted: nowHearted });
  } catch (err) {
    console.error('heartUtils: failed to sync heart with server', err);
  }

  return nowHearted;
};
