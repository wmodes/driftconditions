// authSlice.js - Redux slice for user authentication
//   - signup thunk for registering a new user
//   - signin thunk for logging in a user
//   - logout thunk for logging out a user

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'; 
import axios from 'axios';

// Import the config object from the config.js file
import config from '../config/config';
// pull variables from the config object
const serverBaseURL = config.adminServer.baseURL;
// Routes
const signupRoute = serverBaseURL + config.adminServer.routes.signup;
const signinRoute = serverBaseURL + config.adminServer.routes.signin;
const logoutRoute = serverBaseURL + config.adminServer.routes.logout;
const checkRoute = serverBaseURL + config.adminServer.routes.check;

// createAsyncThunk is used to handle asynchronous logic, allowing for side effects like API calls.
// It automatically manages pending, fulfilled, and rejected action types based on the promise state.

// signup thunk for registering a new user. Utilizes Axios for posting user data to the server.
// On success or failure, it either returns the user data or rejects with an error message.
export const signup = createAsyncThunk(signupRoute, 
  async ({username, password, firstname, lastname, email}, thunkAPI) => {
  try {
    const response = await axios.post(
      signupRoute, 
      {username, password, firstname, lastname, email}
    );
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message);  
  }
});

// signin thunk for logging in a user. It sends username and password to the server,
// and handles the response similarly to the signup thunk.
export const signin = createAsyncThunk(
  signinRoute, 
  async ({username, password}, thunkAPI) => {
  try {
    // Send a POST request to the server with the user's credentials
    await axios.post(
      signinRoute, 
      {username, password}, 
      { withCredentials: true }
    );
  } catch (error) {
    console.error(error);
    return thunkAPI.rejectWithValue(error.message);  
  }
})

// logout thunk for logging out a user. It sends a POST request to the server to invalidate the user's session.
export const logout = createAsyncThunk(
  logoutRoute, 
  async (_, thunkAPI) => {
  try {
    await axios.post(
      logoutRoute, 
      {}, 
      { withCredentials: true }
    );
    // Return a specific payload to indicate successful logout
    return { message: 'Logged out successfully' };
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message);
  }
});

export const checkPageAuth = createAsyncThunk(
  checkRoute, // Ensure a unique action type
  async ({context}, thunkAPI) => {
    try {
      const response = await axios.post(
        checkRoute, 
        { context }, 
        { withCredentials: true }
      );
      // Assuming successful response returns a structure {status: 'success', data: {...}}
      return response.data; // Directly return the data if successful
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response);
    }
  }
);

// Initial state for the auth slice, setting up default values for user authentication status.
const initialState = {  
  // token: null,
  // userID: null,
  user: {},
  loading: false,
  error: null,
  authChecked: false,
};

// authSlice defines the Redux slice for authentication, including reducers for state changes
// and extraReducers for handling the lifecycle of async actions defined above.
export const authSlice = createSlice({
  name: 'auth',
  user: {},
  initialState,
  reducers: {
    setUserAttributes: (state, action) => {
      state.user = action.payload;
    },  
    setAuthChecked: (state, action) => {
      state.authChecked = action.payload.authChecked;
    },
  },
  extraReducers: (builder) => {
    builder
      // signup
      .addCase(signup.pending, (state, action) => {
        state.loading = true; 
        state.error = null;
      })
      .addCase(signup.fulfilled, (state, action) => {
        state.loading = false;  
        state.user = action.payload.username;
        state.error = null;
      })
      .addCase(signup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // signin
      .addCase(signin.pending, (state, action) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signin.fulfilled, (state, action) => {
        state.loading = false;   
        state.error = null;
      })
      .addCase(signin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // logout
      .addCase(logout.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
        state.user = null; // Reset the user object upon successful logout
        state.authChecked = false; // Reset authChecked to false
      })
      .addCase(logout.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // checkPageAuth
      .addCase(checkPageAuth.fulfilled, (state, action) => {
        state.user = action.payload.user;
        // console.log('Authentication check successful:', action.payload);
      })
      .addCase(checkPageAuth.rejected, (state, action) => {
        // Handle rejected state. You might set an error state or flag the user as not authenticated
        console.error('Authentication check failed:', action.payload);
      });
  }
});

// Exports the logout action for use in components and the reducer function for the Redux store.
export const { setUserAttributes, setAuthChecked, setLoading, setError } = authSlice.actions;
export default authSlice.reducer;