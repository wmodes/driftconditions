
// format loose date for database
export function formatDateForDB(dateStr) {
  return new Date(dateStr).toISOString().split('T')[0];
}

// format db date for display
export function formatDateForDisplay(date) {
  return new Date(date).toLocaleDateString();
}

// format tags for database with normalization
export function formatTagsForDB(tagStr) {
  return tagStr.split(',')
    .map(tag =>
      // Convert to lowercase, trim whitespace, then replace special characters and spaces with dashes
      tag.toLowerCase().trim().replace(/[\W_]+/g, '-').replace(/^-+|-+$/g, '')
    )
    // Remove duplicate tags
    .filter((value, index, self) => self.indexOf(value) === index);
}

// format tags for display
export function formatTagsForDisplay(tags) {
  return tags.join(', ');
}

export function niceDate(dateString) {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).replace(',', ' at');
}

export function niceList(input) {
  if (!input) return '';
  // Ensure input is treated as an array, useful if the input is an "array-like" object
  const arrayInput = Array.isArray(input) ? input : Object.values(input);
  return arrayInput.join(', ');
}