// queryUtils - Utility functions for constructing and parsing query parameters

/**
 * Constructs query parameters for audio list fetch requests.
 *
 * @param {Object} filters - The filters to apply (e.g., uploader, editor, date range, classification, tags, status).
 * @param {Object} sorting - The sorting options (e.g., sortBy and sortOrder).
 * @param {number} page - The current page number.
 * @param {number} pageSize - The number of records per page.
 * @returns {Object} The query parameters object.
 */
export function constructQueryParams(filters, sorting, page, pageSize) {
  const queryParams = {
    filters: {},
    sorting: {},
    pagination: {},
  };

  // Add filters to the queryParams object if they exist
  if (filters) {
    queryParams.filters = { ...filters };
  }

  // Add sorting options to the queryParams object
  if (sorting && sorting.sortBy && sorting.sortOrder) {
    queryParams.sorting = {
      sortBy: sorting.sortBy,
      sortOrder: sorting.sortOrder,
    };
  } else {
    // Default sorting if not provided
    queryParams.sorting = {
      sortBy: 'editDate', // Default to sorting by edit date
      sortOrder: 'desc', // Default to descending order
    };
  }

  // Add pagination details to the queryParams object
  queryParams.pagination = {
    page: page || 1, // Default to page 1 if not specified
    pageSize: pageSize || 20, // Default to 20 records per page if not specified
  };

  return queryParams;
}

/**
 * Parses abbreviated tags for display in a table or list.
 *
 * @param {Array} tags - The tags array to abbreviate.
 * @returns {string} The abbreviated tags string.
 */
export function abbreviateTags(tags) {
  if (!tags || !tags.length) return '';
  // Join the tags into a single string, abbreviating if there are more than 3 tags
  return tags.length > 3 ? `${tags.slice(0, 3).join(', ')}...` : tags.join(', ');
}

/**
 * Converts a query parameters object into a URL query string.
 *
 * @param {Object} queryParams - The query parameters object.
 * @returns {string} The URL query string.
 */
export function stringifyQuery(queryParams) {
  const parts = [];
  for (const key in queryParams) {
    let value = queryParams[key];
    if (value !== null && typeof value !== 'undefined') {
      if (typeof value === 'object') {
        value = JSON.stringify(value);
      }
      parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
    }
  }
  return parts.join('&');
}

/**
 * Parses a URL query string into an object.
 *
 * @param {string} queryString - The URL query string.
 * @returns {Object} The parsed query parameters object.
 */
export function parseQuery(queryString) {
  const params = {};
  // Remove the leading '?' if it exists
  const queries = queryString[0] === '?' ? queryString.substring(1) : queryString;
  const pairs = queries.split('&');
  pairs.forEach((pair) => {
    const [key, value] = pair.split('=');
    if (key) params[decodeURIComponent(key)] = decodeURIComponent(value || '');
  });
  return params;
}
