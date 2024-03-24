// recipeSlice - Redux Toolkit Slice for Recipe Actions

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios'; // Assuming axios for HTTP requests

// Import the config object from the config.js file
const config = require('../config/config');
// Pull variables from the config object
const serverBaseURL = config.server.baseURL;

// Define the routes for Recipe actions
const recipeCreateRoute = serverBaseURL + config.server.routes.recipeCreate;
const recipeInfoRoute = serverBaseURL + config.server.routes.recipeInfo;
const recipeUpdateRoute = serverBaseURL + config.server.routes.recipeUpdate;
const recipeListRoute = serverBaseURL + config.server.routes.recipeList;
const recipeTrashRoute = serverBaseURL + config.server.routes.recipeTrash;

// Async thunk for creating a recipe
export const recipeCreate = createAsyncThunk( 
  recipeCreateRoute,
  async ({recipeRecord}, thunkAPI) => {
    // console.log('recipeCreate thunk: recipeRecord:', recipeRecord);
    try {
      const response = await axios.post(
        recipeCreateRoute, 
        recipeRecord, 
        {
          headers: {'Content-Type': 'application/json'},
          withCredentials: true,
        }
      );
      return response.data;
    } catch (error) {
      console.error('Create recipe error:', error);
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

// Async thunk for fetching recipe info
export const recipeInfo = createAsyncThunk(
  recipeInfoRoute,
  async ({recipeID}, thunkAPI) => {
    try {
      const response = await axios.post(
        recipeInfoRoute, 
        {recipeID}, 
        {
          headers: {'Content-Type': 'application/json'},
          withCredentials: true
        }
      );
      return response.data;
    } catch (error) {
      console.error('Fetch recipe info error:', error);
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

// Async thunk for updating a recipe
export const recipeUpdate = createAsyncThunk(
  recipeUpdateRoute,
  async ({recipeRecord}, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        recipeUpdateRoute, 
        recipeRecord, 
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

// Define async thunk for fetching the recipe list
export const recipeList = createAsyncThunk(
  recipeListRoute,
  async ({queryParams}, thunkAPI) => {
    try {
      const response = await axios.post(
        recipeListRoute, 
        queryParams, 
        {withCredentials: true}
      );
      // Assuming the response includes { totalRecords, recipeList }
      return response.data;
    } catch (error) {
      console.error('Fetch recipe list error:', error);
      return thunkAPI.rejectWithValue(error.response.data);
    }
  }
);

// Async thunk for deleting a recipe
export const recipeTrash = createAsyncThunk(
  recipeTrashRoute,
  async ({recipeID}, thunkAPI) => {
    try {
      const response = await axios.post(
        recipeTrashRoute, 
        {recipeID}, 
        {withCredentials: true}
      );
      return response.data;
    } catch (error) {
      console.error('Trash recipe error:', error);
      return thunkAPI.rejectWithValue(error.response.data);
    }
  }
);

const recipeSlice = createSlice({
  name: 'recipes',
  initialState: {
    recipeRecord: null,
    isLoading: false,
    error: null,
  },
  reducers: {
    // Define any synchronous actions here
  },
  extraReducers: (builder) => {
    builder
      // recipeCreate
      .addCase(recipeCreate.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(recipeCreate.fulfilled, (state, action) => {
        state.isLoading = false;
        state.recipeRecord = action.payload;
        state.error = null;
      })
      .addCase(recipeCreate.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // recipeInfo
      .addCase(recipeInfo.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(recipeInfo.fulfilled, (state, action) => {
        state.isLoading = false;
        state.recipeRecord = action.payload; // Assuming the response contains recipe data
        state.error = null;
      })
      .addCase(recipeInfo.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // recipeList
      .addCase(recipeList.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(recipeList.fulfilled, (state, action) => {
        state.isLoading = false;
        state.list = action.payload; // assuming the payload is the list of recipe records
        state.error = null;
      })
      .addCase(recipeList.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // recipeUpdate
      .addCase(recipeUpdate.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(recipeUpdate.fulfilled, (state, action) => {
        state.isLoading = false;
        // Here, you might want to update the state to reflect the changes made to the recipe data.
        // This could mean updating a specific recipe item within a list, for example.
        state.error = null;
      })
      .addCase(recipeUpdate.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
  }, 
});

// Export actions and reducer
export default recipeSlice.reducer;
