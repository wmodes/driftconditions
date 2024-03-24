// formatUtil - utilities for formatting data

import JSON5 from 'json5';

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

// format tags for database with normalization
export function formatTagStrAsArray(tags) {
  if (!tags) return [];
  var tagArray;
  if (typeof tags === 'string') {
    tagArray = tags.split(',');
  } else if (Array.isArray(tags)) {
    tagArray = tags;
  }
  return tagArray.map(tag =>
      // Convert to lowercase, trim whitespace, then replace special characters and spaces with dashes
      tag.toLowerCase().trim().replace(/[\W_]+/g, '-').replace(/^-+|-+$/g, '')
    )
    // Remove duplicate tags
    .filter((value, index, self) => self.indexOf(value) === index);
}

export const formatTagsAsString = formatListAsString;

// Takes a JSON object and pretty prints it as a string using JSON5 with indentation.
export const formatJSONForDisplay = (json) => {
  if (typeof json === 'string') {
    return JSON5.stringify(JSON5.parse(json), null, '\t');
  } else {
    return JSON5.stringify(json, null, '\t');
  }
};

// Takes a JSON string, parses it as JSON5 (which is more lenient than standard JSON),
// and returns the equivalent JavaScript object.
export const formatJSONStrForDB = (jsonStr) => {
  // console.log('formatJSONStrForDB jsonStr:', jsonStr);
  // Parse the JSON5 string to an object
  return JSON5.parse(jsonStr);
};

// Takes a classification array and formats it for the form.
export const setClassificationFormOptions = (options, responses) => {
  if (typeof responses === 'boolean') {
    // If responses is a boolean, set all options to that boolean value.
    return options.reduce((acc, option) => ({
      ...acc,
      [option]: responses
    }), {});
  } else {
    // If responses is an array, set true for options included in the array, false otherwise.
    return options.reduce((acc, option) => ({
      ...acc,
      [option]: responses.includes(option)
    }), {});
  }
};

// Takes a classification object and formats it for the database.
export const formatClassificationForDB = (classificationObject) => {
  return Object.keys(classificationObject).filter(key => classificationObject[key]);
};