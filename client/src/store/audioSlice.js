import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios'; // Assuming axios for HTTP requests

// Import the config object from the config.js file
const config = require('../config/config');
// pull variables from the config object
const serverBaseURL = config.server.baseURL;

// Routes
const audioUploadRoute = serverBaseURL + config.server.routes.audioUpload;
const audioInfoRoute = serverBaseURL + config.server.routes.audioInfo;
const audioEditRoute = serverBaseURL + config.server.routes.audioEdit;
const audioListRoute = serverBaseURL + config.server.routes.audioList;
const audioTrashRoute = serverBaseURL + config.server.routes.audioTrash;

// Async thunk for uploading audio
export const audioUpload = createAsyncThunk(audioUploadRoute, async (formData, thunkAPI) => {
    try {
      const response = await axios.post(audioUploadRoute, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      console.error('Upload error:', error);
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

// Async thunk for fetching audio info
export const audioInfo = createAsyncThunk(audioInfoRoute, async (audioID, thunkAPI) => {
    try {
      // Assuming you need to send the audioID within a request body for a POST request.
      const response = await axios.post(audioInfoRoute, { audioID }, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      console.error('Fetch audio info error:', error);
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);


// Async thunk for editing audio
export const audioEdit = createAsyncThunk(audioEditRoute, async (formData, thunkAPI) => {
    try {
      const response = await axios.post(audioEditRoute, formData, {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      console.error('Audio edit error:', error);
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

// Define async thunk for fetching the audio list
export const audioList = createAsyncThunk(audioListRoute, async ({ queryParams }, thunkAPI) => {
    try {
      const response = await axios.post(audioListRoute, queryParams, {
        withCredentials: true,
      });
      // Assuming the response includes { totalRecords, audioList }
      return response.data; 
    } catch (error) {
      console.error('Fetch audio list error:', error);
      return thunkAPI.rejectWithValue(error.response.data);
    }
  }
);

// Async thunk for trashing an audio
export const audioTrash = createAsyncThunk(audioTrashRoute, async (audioID, thunkAPI) => {
    try {
      const response = await axios.post(audioTrashRoute, {}, {
        withCredentials: true,
      });
      return response.data; // Assuming the API returns some data on success
    } catch (error) {
      console.error('Trash audio error:', error);
      return thunkAPI.rejectWithValue(error.response.data);
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
  extraReducers: (builder) => {
    builder
      .addCase(audioUpload.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(audioUpload.fulfilled, (state, action) => {
        state.isLoading = false;
        state.audioData = action.payload;
        state.error = null;
      })
      .addCase(audioUpload.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(audioInfo.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(audioInfo.fulfilled, (state, action) => {
        state.isLoading = false;
        state.audioData = action.payload; // Assuming the response contains audio data
        state.error = null;
      })
      .addCase(audioInfo.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(audioEdit.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(audioEdit.fulfilled, (state, action) => {
        state.isLoading = false;
        // Optionally update audioData or handle success differently
        state.error = null;
      })
      .addCase(audioEdit.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(audioList.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(audioList.fulfilled, (state, action) => {
        state.isLoading = false;
        state.list = action.payload; // assuming the payload is the list of audio records
        state.error = null;
      })
      .addCase(audioList.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  }, 
});

// Export actions and reducer
export default audioSlice.reducer;
