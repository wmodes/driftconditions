// formatUtil - utilities for formatting data

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

// format tags for database with normalization
export function formatListForDB(tagStr) {
  return tagStr.split(',')
    .map(tag =>
      // Convert to lowercase, trim whitespace, then replace special characters and spaces with dashes
      tag.toLowerCase().trim().replace(/[\W_]+/g, '-').replace(/^-+|-+$/g, '')
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