// formatUtil - utilities for formatting data

const JSON5 = require('json5');

// format loose date for database
export function formatDateForDB(dateStr) {
  return new Date(dateStr).toISOString().split('T')[0];
}

// format db date for display
export function formatDateForDisplay(dateString) {
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
export function formatListStrForDB(tagStr) {
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

export function formatListForDisplay(input) {
  if (!input) return '';
  // Ensure input is treated as an array, useful if the input is an "array-like" object
  const arrayInput = Array.isArray(input) ? input : Object.values(input);
  return arrayInput.join(', ');
}

// format tags for database with normalization
export function formatTagStrForDB(tags) {
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

// Takes a JSON object and pretty prints it as a string using JSON5 with indentation.
export const formatJSONForDisplay = (jsonObj) => {
  // JSON5.stringify(value, replacer, space)
  // space - A String or Number that allows you to control spacing in the final string.
  // Using a tab character mimics standard pretty-print appearance.
  return JSON5.stringify(jsonObj, null, '\t'); // Use '\t' for tab-indented pretty-print
};


// Takes a JSON string, parses it as JSON5 (which is more lenient than standard JSON),
// and returns the equivalent JavaScript object.
export const formatJSONStrForDB = (jsonStr) => {
  // Parse the JSON5 string to an object
  return JSON5.parse(jsonStr);
};

export const formatTagsForDisplay = formatListForDisplay;