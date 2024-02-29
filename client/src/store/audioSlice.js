import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios'; // Assuming axios for HTTP requests

// Async thunk for uploading audio
export const uploadAudio = createAsyncThunk('audio/upload', async (formData, thunkAPI) => {
    try {
      const response = await axios.post('/api/audio/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Upload error:', error);
      return thunkAPI.rejectWithValue(error.message); // Correctly use rejectWithValue with error.message
    }
  }
);

const audioSlice = createSlice({
  name: 'audio',
  initialState: {
    audioData: null,
    isLoading: false,
    error: null,
  },
  reducers: {
    // Define any synchronous actions here
  },
  extraReducers: {
    [uploadAudio.pending]: (state, action) => {
      state.isLoading = true;
      state.error = null;
    },
    [uploadAudio.fulfilled]: (state, action) => {
      state.isLoading = false;
      state.audioData = action.payload;
      state.error = null;
    },
    [uploadAudio.rejected]: (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    },
  },
});

// Export actions and reducer
export default audioSlice.reducer;
