// Setup of the Redux store with Redux Toolkit, enhancing configuration simplicity and middleware integration.
import { configureStore } from '@reduxjs/toolkit';
import authSlice from './authSlice'; // Importing the auth slice to handle authentication related state.

export const store = configureStore({
  reducer: {
    auth: authSlice // Registers authSlice under the 'auth' namespace in the global state.
  }
  // This store setup facilitates state management and encapsulates authentication logic within the auth slice.
  // The structure allows for easy integration of additional slices for different app features.
});
