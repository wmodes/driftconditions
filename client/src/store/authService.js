// authService.js configures a custom Axios instance with interceptors for automated token management in API requests.

import axios from 'axios';
import store from 'store'; 

// Creates a new Axios instance for customized configuration.
const api = axios.create();

// Sets up a request interceptor to inject the Authorization header into every request.
api.interceptors.request.use(config => {
  // Attempts to retrieve the token from sessionStorage or Redux state.
  const token = sessionStorage.getItem('sessionToken') || store.getState().auth.token;

  // TODO: Check if the token is expired or about to expire soon
  // If so, dispatch refreshToken action to get a new token
  // This part requires you to implement logic to check token validity and refresh it
  
  if (token) {
    // If a token is found, it's appended to the request headers as a Bearer token.
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config; // Returns the modified config to proceed with the request.
});

export default api; // Exports the custom Axios instance for use throughout the application.
