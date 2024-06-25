// formatUtil - utilities for formatting data

import JSON5 from 'json5';
const { parse: JSONparse, stringify: JSONstringify } = require('comment-json');

// format loose date for database
export function formatDateForDB(dateStr) {
  return new Date(dateStr).toISOString().split('T')[0];
}

// format db date for display
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

// format list for database with normalization
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

export function formatListAsString(input) {
  if (!input) return '';
  // Ensure input is treated as an array, useful if the input is an "array-like" object
  const arrayInput = Array.isArray(input) ? input : Object.values(input);
  return arrayInput.join(', ');
}

// Normalize a single tag string
export function normalizeTag(tag) {
  return tag
    .toLowerCase()
    .trim()
    .replace(/[\W_]+/g, '-') // Replace special characters and spaces with dashes
    .replace(/^-+|-+$/g, ''); // Remove leading and trailing dashes
}

// Format tags for database with normalization
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

// Takes a JSON object and pretty prints it as a string using comment-json with indentation.
export const formatJSONForDisplay = (json) => {
  if (typeof json === 'string') {
    return json;
    // return JSONstringify(JSONparse(json), null, '\t');  // Use tab for indentation
  } else {
    return JSONstringify(json, null, '\t');  // Directly stringify the object with tab for indentation
  }
};

// Takes a JSON string, parses it as comment-json (which preserves comments and formatting),
// and returns the equivalent JavaScript object.
export const formatJSONStrForDB = (jsonStr) => {
  return jsonStr;
  // return JSONparse(jsonStr);  // Parse the JSON5 string while preserving comments and formatting
};

// Takes a classification array and formats it for the form.
export const setClassificationFormOptions = (options, keysSetToTrue) => {
  // console.log(`formatUtils.setClassificationFormOptions options: ${JSON.stringify(options)}, responses: ${JSON.stringify(keysSetToTrue)})`);
  if (typeof keysSetToTrue === 'boolean') {
    // If responses is a boolean, set all options to that boolean value.
    return options.reduce((acc, option) => ({
      ...acc,
      [option]: keysSetToTrue
    }), {});
  } else {
    // If responses is an array, set true for options included in the array, false otherwise.
    return options.reduce((acc, option) => ({
      ...acc,
      [option]: keysSetToTrue.includes(option)
    }), {});
  }
};

// Takes a classification object and formats it for the database.
export const formatClassificationForDB = (classificationObject) => {
  return Object.keys(classificationObject).filter(key => classificationObject[key]);
};