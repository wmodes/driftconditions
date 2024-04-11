import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios'; // Assuming axios for HTTP requests

// Import the config object from the config.js file
const config = require('../config/config');
// pull variables from the config object
const serverBaseURL = config.adminServer.baseURL; 

// Routes
const audioUploadRoute = serverBaseURL + config.adminServer.routes.audioUpload;
const audioInfoRoute = serverBaseURL + config.adminServer.routes.audioInfo;
const audioUpdateRoute = serverBaseURL + config.adminServer.routes.audioUpdate;
const audioListRoute = serverBaseURL + config.adminServer.routes.audioList;
const audioTrashRoute = serverBaseURL + config.adminServer.routes.audioTrash;

export const audioUpload = createAsyncThunk(
  audioUploadRoute,
  async ({audioRecord, file}, thunkAPI) => {
    console.log("Thunk received audioRecord:", audioRecord);
    console.log("Thunk received file:", file);

    // Prepare FormData
    const formData = new FormData();
    formData.append('file', file); // Append the file
    // Append other form fields
    Object.keys(audioRecord).forEach(key => {
      formData.append(key, typeof audioRecord[key] === 'object' ? JSON.stringify(audioRecord[key]) : audioRecord[key]);
    });

    try {
      const response = await axios.post(
        audioUploadRoute,
        formData, // Pass formData instead of audioRecord directly
        { 
          headers: {
            'Content-Type': 'multipart/form-data', // This might be optional as browsers set it with the correct boundary
          },
          withCredentials: true,
        }
      );
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
  async ({audioID}, thunkAPI) => {
    try {
      // Change to sending JSON data and adjust content type accordingly
      const response = await axios.post(
        audioInfoRoute, 
        {audioID}, 
        {
          headers: {'Content-Type': 'application/json'},
          withCredentials: true,
        }
      );
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
  async ({audioRecord}, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        audioUpdateRoute, 
        audioRecord, 
        {
          headers: {'Content-Type': 'application/json'},
          withCredentials: true,
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Define async thunk for fetching the audio list
export const audioList = createAsyncThunk(
  audioListRoute, 
  async ({queryParams}, thunkAPI) => {
    try {
      const response = await axios.post(
        audioListRoute, 
        queryParams, 
        {withCredentials: true}
      );
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
      const response = await axios.post(
        audioTrashRoute, 
        {audioID}, 
        {withCredentials: true}
      );
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
    audioRecord: null,
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
        state.audioRecord = action.payload;
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
        state.audioRecord = action.payload; // Assuming the response contains audio data
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
