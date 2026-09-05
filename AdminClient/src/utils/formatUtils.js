/**
 * @file formatUtil.js - utilities for formatting data
 */

import JSON5 from 'json5';
const { parse: JSONparse, stringify: JSONstringify } = require('comment-json');

/**
 * Format loose date for database.
 * @param {string} dateStr - The date string to format.
 * @returns {string} - The formatted date string.
 */
export function formatDateForDB(dateStr) {
  return new Date(dateStr).toISOString().split('T')[0];
}

/**
 * Format db date for display.
 * @param {string} dateString - The date string to format.
 * @returns {string} - The formatted friendly date string.
 */
export function formatDateAsFriendlyDate(dateString) {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).replace(',', ' at');
}

/**
 * Format list for database with normalization.
 * @param {string} tagStr - The tag string to format.
 * @returns {Array<string>} - The formatted list as an array.
 */
export function formatListStrAsArray(tagStr) {
  // console.log('formatListForDB tagStr:', tagStr);
  if (!tagStr) return '';
  return tagStr.split(',')
    .map(tag =>
      // trim whitespace
      tag.trim()
    )
    // Remove duplicate tags
    .filter((value, index, self) => self.indexOf(value) === index);
}

/**
 * Format list as a string.
 * @param {Array<string>|Object} input - The input array or array-like object.
 * @returns {string} - The formatted list as a string.
 */
export function formatListAsString(input) {
  if (!input) return '';
  // Ensure input is treated as an array, useful if the input is an "array-like" object
  const arrayInput = Array.isArray(input) ? input : Object.values(input);
  return arrayInput.join(', ');
}

/**
 * Normalize a single tag string.
 * @param {string} tag - The tag to normalize.
 * @returns {string} - The normalized tag.
 */
export function normalizeTag(tag) {
  return tag
    .toLowerCase()
    .trim()
    .replace(/[\W_]+/g, '-') // Replace special characters and spaces with dashes
    .replace(/^-+|-+$/g, ''); // Remove leading and trailing dashes
}

/**
 * Format tags for database with normalization.
 * @param {string|Array<string>} tags - The tags to format.
 * @returns {Array<string>} - The formatted tags as an array.
 */
export function formatTagStrAsArray(tags) {
  if (!tags) return [];
  let tagArray;
  if (typeof tags === 'string') {
    tagArray = tags.split(',');
  } else if (Array.isArray(tags)) {
    tagArray = tags;
  } else {
    return []; // Handle unexpected types gracefully
  }
  return tagArray
    .map(normalizeTag) // Apply normalization to each tag
    .filter((value, index, self) => self.indexOf(value) === index); // Remove duplicate tags
}

export const formatTagsAsString = formatListAsString;

/**
 * Takes a JSON object and pretty prints it as a string using comment-json with indentation.
 * @param {Object|string} json - The JSON object or string to format.
 * @returns {string} - The formatted JSON string.
 */
export const formatJSONForDisplay = (json) => {
  if (typeof json === 'string') {
    return json;
    // return JSONstringify(JSONparse(json), null, '\t');  // Use tab for indentation
  } else {
    return JSONstringify(json, null, '\t');  // Directly stringify the object with tab for indentation
  }
};

/**
 * Takes a JSON string, parses it as comment-json (which preserves comments and formatting),
 * and returns the equivalent JavaScript object.
 * @param {string} jsonStr - The JSON string to format.
 * @returns {Object} - The parsed JavaScript object.
 */
export const formatJSONStrForDB = (jsonStr) => {
  return jsonStr;
  // return JSONparse(jsonStr);  // Parse the JSON5 string while preserving comments and formatting
};

/**
 * Format a duration in seconds to m:ss display format.
 * @param {number|string} seconds - Duration in seconds.
 * @returns {string} - Formatted duration string (e.g. "2:07").
 */
export function formatDuration(seconds) {
  const total = Math.floor(parseFloat(seconds) || 0);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Takes a classification array and formats it for the form.
 *
 * Keys are lowercased so this object's keys always match the checkbox
 * `name`/`value` attributes in ClassificationCheckboxes (which are lowercase
 * per config.audio.classificationFields). Without this, a checkbox change
 * writes a new lowercase key instead of updating the existing one, so
 * unchecking a box never removes it from what's submitted. See
 * formatClassificationForDB for where this maps back to canonical casing.
 * @param {Array<string>} options - The classification options.
 * @param {Array<string>|boolean} keysSetToTrue - The keys to set to true or a boolean value.
 * @returns {Object} - The formatted classification form options, lowercase-keyed.
 */
export const setClassificationFormOptions = (options, keysSetToTrue) => {
  // console.log(`formatUtils.setClassificationFormOptions options: ${JSON.stringify(options)}, responses: ${JSON.stringify(keysSetToTrue)})`)

  if (typeof keysSetToTrue === 'boolean') {
    // If responses is a boolean, set all options to that boolean value.
    return options.reduce((acc, option) => ({
      ...acc,
      [option.toLowerCase()]: keysSetToTrue
    }), {});
  } else {
    // If responses is an array, set true for options included in the array, false otherwise.
    const normalizedKeysSetToTrue = keysSetToTrue.map(key => key.toLowerCase());

    return options.reduce((acc, option) => ({
      ...acc,
      [option.toLowerCase()]: normalizedKeysSetToTrue.includes(option.toLowerCase())
    }), {});
  }
};

/**
 * Takes a classification object and formats it for the database.
 * @param {Object} classificationObject - The lowercase-keyed classification object.
 * @param {Array<string>} options - The canonical classification options (for casing lookup).
 * @returns {Array<string>} - The formatted classification as an array, canonically cased.
 */
export const formatClassificationForDB = (classificationObject, options) => {
  // classificationObject is lowercase-keyed (see setClassificationFormOptions);
  // map back to the canonical casing from `options` for storage/display.
  const canonicalByLower = new Map(options.map(option => [option.toLowerCase(), option]));
  return Object.keys(classificationObject)
    .filter(key => classificationObject[key])
    .map(key => canonicalByLower.get(key) || key);
};

/**
 * Checks whether a file's extension is in the allowed list.
 * Validates by extension rather than the browser-reported MIME type (file.type),
 * which is inconsistent across OS/browser combinations — e.g. a WAV file may be
 * reported as 'audio/wav', 'audio/x-wav', 'audio/wave', or even '' depending on
 * the system, causing valid files to be rejected.
 * @param {File} file - The file object.
 * @param {string[]} allowedExtensions - Lowercase extensions including the dot, e.g. ['.wav', '.mp3'].
 * @returns {boolean} - True if the file's extension is in the allowed list.
 */
export const isAllowedFileType = (file, allowedExtensions) => {
  const match = file.name.match(/\.[^/.]+$/);
  const ext = match ? match[0].toLowerCase() : '';
  return allowedExtensions.includes(ext);
};

/**
 * Generates a human-readable title from an audio filename.
 * Preserves commas, dashes, slashes, apostrophes, periods, and parentheses.
 * Applies title case only if the original filename stem was all uppercase.
 * @param {File} file - The file object.
 * @returns {string} - The generated title.
 */
export const generateTitle = (file) => {
  const stem = file.name.replace(/\.[^/.]+$/, '');
  const isAllUpper = stem === stem.toUpperCase() && /[A-Z]/.test(stem);
  let title = stem.replace(/_/g, ' ');
  title = title.replace(/[^\w\s,'/().-]+/g, ' ');
  title = title.trim().replace(/\s+/g, ' ');
  if (isAllUpper) {
    title = title.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
  }
  return title.replace(/\s{2,}/g, ' ').trim();
};
