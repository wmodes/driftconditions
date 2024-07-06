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
 * Takes a classification array and formats it for the form.
 * @param {Array<string>} options - The classification options.
 * @param {Array<string>|boolean} keysSetToTrue - The keys to set to true or a boolean value.
 * @returns {Object} - The formatted classification form options.
 */
export const setClassificationFormOptions = (options, keysSetToTrue) => {
  console.log(`formatUtils.setClassificationFormOptions options: ${JSON.stringify(options)}, responses: ${JSON.stringify(keysSetToTrue)})`);

  if (typeof keysSetToTrue === 'boolean') {
    // If responses is a boolean, set all options to that boolean value.
    return options.reduce((acc, option) => ({
      ...acc,
      [option]: keysSetToTrue
    }), {});
  } else {
    // If responses is an array, set true for options included in the array, false otherwise.
    const normalizedKeysSetToTrue = keysSetToTrue.map(key => key.toLowerCase());

    return options.reduce((acc, option) => ({
      ...acc,
      [option]: normalizedKeysSetToTrue.includes(option.toLowerCase())
    }), {});
  }
};

/**
 * Takes a classification object and formats it for the database.
 * @param {Object} classificationObject - The classification object.
 * @returns {Array<string>} - The formatted classification as an array.
 */
export const formatClassificationForDB = (classificationObject) => {
  return Object.keys(classificationObject).filter(key => classificationObject[key]);
};
