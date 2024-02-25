// authService.js configures a custom Axios instance with interceptors for automated token management in API requests.

import axios from 'axios';

// Creates a new Axios instance for customized configuration.
const api = axios.create();

export default api; // Exports the custom Axios instance for use throughout the application.
