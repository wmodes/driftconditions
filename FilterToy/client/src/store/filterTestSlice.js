import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Async thunk for running the filter test via a server API
export const processFilterChain = createAsyncThunk(
  'filterTest/processFilterChain',
  async (filterChain, thunkAPI) => {
    try {
      const response = await axios.post('http://localhost:8081/api/ffmpeg/process-filter', {
        filterChain
      });
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

// Slice definition
const filterTestSlice = createSlice({
  name: 'filterTest',
  initialState: {
    loading: false,
    data: null,
    error: null,
    status: null  // Add a status field if needed
  },
  reducers: {
    clearError(state) {
      state.error = null;
    },
    clearData(state) {
      state.data = null;
    },
    // Optionally, manage the status explicitly
    setStatus(state, action) {
      state.status = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(processFilterChain.pending, (state) => {
        state.loading = true;
        state.status = 'loading'; // Optionally manage status states
      })
      .addCase(processFilterChain.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
        state.error = null;
        state.status = 'successful'; // Optionally manage status states
      })
      .addCase(processFilterChain.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.status = 'failed'; // Optionally manage status states
      });
  }
});

// Export the action creators from the reducers
export const { clearError, clearData, setStatus } = filterTestSlice.actions;

// Export the reducer
export default filterTestSlice.reducer;
