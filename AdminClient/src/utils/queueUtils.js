/**
 * @file Utility functions for queue and playlist data.
 */

import config from '../config/config';

const { staticBaseURL } = config.app;

/**
 * Resolve a coverImage path (e.g. "img/covers/152.jpg") to a full URL.
 * The coverImage field already contains the relative path and extension.
 * Returns null if no coverImage is provided.
 */
export const resolveCoverImageURL = (coverImage) => {
  if (!coverImage) return null;
  return `${staticBaseURL}/${coverImage}`;
};

/**
 * Helper function to format date and time in the user's local time zone.
 *
 * @param {string} datetime - The date and time string in UTC.
 * @returns {string} The formatted time string in the user's local time zone.
 */
export const formatTime = (datetime) => {
  const date = new Date(datetime);
  // Replace standard space with a non-breaking space character
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).replace(' ', ' ');
};
