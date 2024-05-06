// userSlice.js - Redux slice for user profile and user profile editing
//  - profile - Async thunk to fetch a user's profile
//  - profileEdit - Async thunk to edit a user's profile

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Import the config object from the config.js file
import config from '../config/config';

// pull variables from the config object
const serverBaseURL = config.adminServer.baseURL;

// Routes
const profileRoute = serverBaseURL + config.adminServer.routes.profile;
const profileEditRoute = serverBaseURL + config.adminServer.routes.profileEdit;
const userListRoute = serverBaseURL + config.adminServer.routes.userList;
const roleListRoute = serverBaseURL + config.adminServer.routes.roleList;
const roleUpdateRoute = serverBaseURL + config.adminServer.routes.roleUpdate;
const userDisableRoute = serverBaseURL + config.adminServer.routes.userDisable;

export const profileInfo = createAsyncThunk(
  profileRoute,
  async ({username}, thunkAPI) => {
    try {
      // confirmed effectively passing username from url
      // console.log(`userSlice: profileInfo: username: ${username}`);
      // Prepare the request body based on whether a username is provided
      const response = await axios.post(
        profileRoute, 
        {username}, 
        {withCredentials: true}
      );
      if (response.data.success) {
        return response.data;
      } else {
        // Assuming your API consistently returns a success flag and a message in cases of failure
        return thunkAPI.rejectWithValue(response.data.message);
      }
    } catch (error) {
      console.error('Fetch profile error:', error);
      // Assuming your API error responses are structured in a certain way
      const message = error.response?.data?.message || error.message;
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const profileEdit = createAsyncThunk(
  profileEditRoute, 
    async ({username}, thunkAPI) => {
    try {
      console.log(`userSlice: profileEdit: username: ${username}`);
      const response = await axios.post(
        profileEditRoute, 
        {username}, 
        { withCredentials: true }
      );
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

// Define async thunk for fetching the audio list
export const userList = createAsyncThunk(
  userListRoute, 
  async ({queryParams}, thunkAPI) => {
    try {
      const response = await axios.post(
        userListRoute, 
        queryParams, 
        {withCredentials: true}
      );
      // Assuming the response includes { totalRecords, audioList }
      return response.data; 
    } catch (error) {
      console.error('Fetch user list error:', error);
      return thunkAPI.rejectWithValue(error.response.data);
    }
  }
);

// Define async thunk for fetching the role list
export const roleList = createAsyncThunk(
  roleListRoute, 
  async (_, thunkAPI) => {
    try {
      const response = await axios.post(
        roleListRoute, 
        {},
        {withCredentials: true}
      );
      // Assuming the response includes { totalRecords, audioList }
      return response.data; 
    } catch (error) {
      console.error('Fetch role list error:', error);
      return thunkAPI.rejectWithValue(error.response.data);
    }
  }
);

export const roleUpdate = createAsyncThunk(
  roleUpdateRoute, 
  async ({roleRecord}, thunkAPI) => {
  try {
    const response = await axios.post(
      roleUpdateRoute, 
      roleRecord, 
      {withCredentials: true}
    );
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.error || error.message);
  }
});

// Async thunk for disabling a user
export const userDisable = createAsyncThunk(
  userDisableRoute,
  async ({userID}, thunkAPI) => {
    try {
      const response = await axios.post(
        userDisableRoute, 
        {userID}, 
        {withCredentials: true}
      );
      return response.data;
    } catch (error) {
      console.error('Disable user error:', error);
      return thunkAPI.rejectWithValue(error.response.data);
    }
  }
);


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
      // profile info
      //
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
      // profile edit
      //
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
      })
      // role list
      //
      .addCase(roleList.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(roleList.fulfilled, (state, action) => {
        state.isLoading = false;
        state.roles = action.payload.roles; 
      })
      .addCase(roleList.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to fetch roles';
      })
      // role update
      //
      .addCase(roleUpdate.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(roleUpdate.fulfilled, (state, action) => {
        state.isLoading = false;
        // Assuming payload contains the updated role, find and update it in the state
        const index = state.roles.findIndex(role => role.roleID === action.payload.roleID);
        if (index !== -1) {
          state.roles[index] = action.payload;
        }
      })
      .addCase(roleUpdate.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to update role';
      })
      //
      // user disable
      //
      .addCase(userDisable.pending, (state) => {
        state.loading = true;
        state.error = null;  // Clear previous errors on new request
      })
      .addCase(userDisable.fulfilled, (state, action) => {
        state.loading = false;
        // Handle user disable success, e.g., updating user status
        // This assumes your payload contains necessary user info
        // and that user information is part of a list or a single profile object
        if (state.profile.userID === action.payload.userID) {
          state.profile.disabled = true;  // Example property to mark as disabled
        }
      })
      .addCase(userDisable.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to disable user';
      })
  }
});

export default userSlice.reducer;
