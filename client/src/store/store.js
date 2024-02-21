// Setup of the Redux store with Redux Toolkit, enhancing configuration simplicity and middleware integration.
import { configureStore } from '@reduxjs/toolkit';
import authSlice from './authSlice'; // Importing the auth slice to handle authentication related state.

// Include any initial state you want preloaded, especially the token from sessionStorage
const preloadedState = {
  auth: {
    token: sessionStorage.getItem('sessionToken') || null,
    // Add other initial state properties as needed
  },
}

export const store = configureStore({
  reducer: {
    // Registers authSlice under the 'auth' namespace in the global state.
    auth: authSlice
  },
  preloadedState
  // This store setup facilitates state management and encapsulates authentication logic within the auth slice.
  // The structure allows for easy integration of additional slices for different app features.
})
