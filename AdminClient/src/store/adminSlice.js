// adminSlice.js - Redux slice for admin-level operations
//  - adminNewsList   - Fetch unsent admin news items
//  - adminNewsCreate - Post a new admin news item

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

import config from '../config/config';

const serverBaseURL = config.adminServer.baseURL;
const adminNewsListRoute   = serverBaseURL + config.adminServer.routes.adminNewsList;
const adminNewsCreateRoute = serverBaseURL + config.adminServer.routes.adminNewsCreate;

export const adminNewsList = createAsyncThunk(
  adminNewsListRoute,
  async (_, thunkAPI) => {
    try {
      const response = await axios.post(adminNewsListRoute, {}, { withCredentials: true });
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.error?.message || 'Server error. Try again later.');
    }
  }
);

export const adminNewsCreate = createAsyncThunk(
  adminNewsCreateRoute,
  async ({ content }, thunkAPI) => {
    try {
      const response = await axios.post(adminNewsCreateRoute, { content }, { withCredentials: true });
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.error?.message || 'Server error. Try again later.');
    }
  }
);

const initialState = {
  news: [],
  loading: false,
  error: null,
};

export const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // admin news list
      .addCase(adminNewsList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(adminNewsList.fulfilled, (state, action) => {
        state.loading = false;
        state.news = action.payload.news;
      })
      .addCase(adminNewsList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch news.';
      })
      // admin news create
      .addCase(adminNewsCreate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(adminNewsCreate.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(adminNewsCreate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to post news item.';
      });
  },
});

export default adminSlice.reducer;
