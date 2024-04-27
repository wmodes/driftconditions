// ffmpegInfoSlice.js - A slice for fetching ffmpeg capabilities

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Define the asynchronous thunk for fetching ffmpeg details
export const fetchFfmpegCapabilities = createAsyncThunk(
  'ffmpegInfo/fetchFfmpegCapabilities',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/ffmpeg/capabilities');
      return response.data; // This should include formats, codecs, encoders, filters
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Create the slice
const ffmpegInfoSlice = createSlice({
  name: 'ffmpegInfo',
  initialState: {
    ffmpegCapabilities: {}, // Single state variable to hold all data
    loading: false,
    error: null
  },
  reducers: {
    clearError(state) {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFfmpegCapabilities.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchFfmpegCapabilities.fulfilled, (state, action) => {
        state.loading = false;
        state.ffmpegCapabilities = action.payload; // Store all fetched data in ffmpegCapabilities
      })
      .addCase(fetchFfmpegCapabilities.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch ffmpeg info';
      });
  }
});

// Export the action creators and the reducer
export const { clearError } = ffmpegInfoSlice.actions;
export default ffmpegInfoSlice.reducer;
