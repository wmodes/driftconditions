import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios'; // Assuming axios for HTTP requests

// Import the config object from the config.js file
const config = require('../config/config');
// pull variables from the config object
const serverBaseURL = config.server.baseURL; 

// Routes
const audioUploadRoute = serverBaseURL + config.server.routes.audioUpload;
const audioInfoRoute = serverBaseURL + config.server.routes.audioInfo;
const audioUpdateRoute = serverBaseURL + config.server.routes.audioUpdate;
const audioListRoute = serverBaseURL + config.server.routes.audioList;
const audioTrashRoute = serverBaseURL + config.server.routes.audioTrash;

// Async thunk for uploading audio
export const audioUpload = createAsyncThunk(
  audioUploadRoute, 
  async (audioID, thunkAPI) => {
    try {
      const response = await axios.post(audioUploadRoute, audioID, {
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
export const audioInfo = createAsyncThunk(
  audioInfoRoute, 
  async (audioID, thunkAPI) => {
    try {
      // Change to sending JSON data and adjust content type accordingly
      const response = await axios.post(audioInfoRoute, { audioID }, {
        headers: {
          'Content-Type': 'application/json',
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

// TODO: make all of the args for thunk and params passed to axios.post consistent

export const audioUpdate = createAsyncThunk(
  audioUpdateRoute, 
  async (audioData, { rejectWithValue }) => {
    try {
      const { audioID, title, status, classification, tags, comments } = audioData;
      const response = await axios.post(audioUpdateRoute, {
        audioID,
        title,
        status,
        classification,
        tags: tags,
        comments
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Define async thunk for fetching the audio list
export const audioList = createAsyncThunk(
  audioListRoute, 
  async (queryParams, thunkAPI) => {
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
export const audioTrash = createAsyncThunk(
  audioTrashRoute, 
  async ({audioID}, thunkAPI) => {
    try {
      const response = await axios.post(audioTrashRoute, { audioID }, {
        withCredentials: true,
      });
      return response.data;
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
      //
      // audioUpload
      //
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
      //
      // audioInfo
      //
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
      //
      // audioList
      //
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
      })
      //
      // audioUpdate
      //
      .addCase(audioUpdate.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(audioUpdate.fulfilled, (state, action) => {
        state.isLoading = false;
        // Here, you might want to update the state to reflect the changes made to the audio data.
        // This could mean updating a specific audio item within a list, for example.
        state.error = null;
      })
      .addCase(audioUpdate.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
  }, 
});

// Export actions and reducer
export default audioSlice.reducer;
