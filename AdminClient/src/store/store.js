// Setup of the Redux store with Redux Toolkit, enhancing configuration simplicity and middleware integration.
import { configureStore } from '@reduxjs/toolkit';
import authSlice from './authSlice';
import audioSlice from './audioSlice';
import userSlice from './userSlice'; 
import appSlice from './appSlice'; 
import formSlice from './formSlice';

// Include any initial state you want preloaded, especially the token from sessionStorage
const preloadedState = {
  auth: {
    token: sessionStorage.getItem('sessionToken') || null,
    // Add other initial state properties as needed
  },
}

export const store = configureStore({
  reducer: {
    auth: authSlice,
    audio: audioSlice, // Add the audio slice to the store
    user: userSlice, // Add the user slice to the store
    app: appSlice, // Add the app slice to the store
    form: formSlice, // Add the unsavedChanges slice to the store
  },
  preloadedState
  // With this setup, your store is now equipped to handle state management for authentication, audio, user, and app-specific states.
})
