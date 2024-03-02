// userSlice.js - Redux slice for user profile and user profile editing
//  - profile - Async thunk to fetch a user's profile
//  - profileEdit - Async thunk to edit a user's profile

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Import the config object from the config.js file
const config = require('../config/config');

// pull variables from the config object
const serverBaseURL = config.server.baseURL;

// Routes
const profileRoute = serverBaseURL + '/api/user/profile';
const profileEditRoute = serverBaseURL + '/api/user/profile/edit';

export const profileInfo = createAsyncThunk(profileRoute, async (_, thunkAPI) => {
  try {
    const response = await axios.post(profileRoute, {}, { withCredentials: true });
    return response.data;
  } catch (error) {
    console.error('Fetch profile error:', error);
    return thunkAPI.rejectWithValue(error.message);
  }
});

export const profileEdit = createAsyncThunk(profileEditRoute, async (userData, thunkAPI) => {
  try {
    const response = await axios.post(profileEditRoute, userData, { withCredentials: true });
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.error || error.message);
  }
});

const initialState = {
  profile: {},
  loading: false,
  error: null,
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    // Add any user-specific reducers here
  },
  extraReducers: (builder) => {
    builder
      .addCase(profileInfo.pending, (state) => {
        state.loading = true;
      })
      .addCase(profileInfo.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
      })
      .addCase(profileInfo.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(profileEdit.pending, (state) => {
        state.loading = true;
      })
      .addCase(profileEdit.fulfilled, (state, action) => {
        state.loading = false;
        // Handle the updated profile data
      })
      .addCase(profileEdit.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export default userSlice.reducer;
