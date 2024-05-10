// queueSlice.js - Redux slice for managing queue data

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios'; // Assuming axios for HTTP requests

// Import the config object from the config.js file
import config from '../config/config';
// pull variables from the config object
const serverBaseURL = config.adminServer.baseURL;
const mixEngineBaseURL = config.mixEngine.baseURL; 

// Routes
const queuePlaylistRoute = mixEngineBaseURL + config.mixEngine.routes.queuePlaylist;

// Async thunk for fetching the playlist
export const fetchQueuePlaylist = createAsyncThunk(
  'queue/fetchQueuePlaylist',
  async (_, { rejectWithValue }) => {
    try {
      console.log(`Fetching queue playlist from ${queuePlaylistRoute}`);
      const response = await axios.get(queuePlaylistRoute);
      return response.data; // Assuming the server response contains the array of playlist objects
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

const queueSlice = createSlice({
  name: 'queue',
  initialState: {
    playlist: [],
    isLoading: false,
    error: null
  },
  reducers: {
    // Define any synchronous actions here if needed
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchQueuePlaylist.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchQueuePlaylist.fulfilled, (state, action) => {
        state.playlist = action.payload;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(fetchQueuePlaylist.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

// Export actions and reducer
export default queueSlice.reducer;