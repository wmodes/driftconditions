// authSlice.js - Redux slice for user authentication
//   - signup thunk for registering a new user
//   - signin thunk for logging in a user
//   - logout thunk for logging out a user

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'; 
import axios from 'axios';

// Import the config object from the config.js file
const config = require('../config/config');

// pull variables from the config object
const serverBaseURL = config.server.baseURL;

// Routes
const signupRoute = serverBaseURL + '/api/auth/signup';
const signinRoute = serverBaseURL + '/api/auth/signin';
const logoutRoute = serverBaseURL + '/api/auth/logout';

// createAsyncThunk is used to handle asynchronous logic, allowing for side effects like API calls.
// It automatically manages pending, fulfilled, and rejected action types based on the promise state.

// signup thunk for registering a new user. Utilizes Axios for posting user data to the server.
// On success or failure, it either returns the user data or rejects with an error message.
export const signup = createAsyncThunk(signupRoute, async ({username, password, firstname, lastname, email}, thunkAPI) => {
  try {
    const response = await axios.post(signupRoute, {username, password, firstname, lastname, email});
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message);  
  }
});

// signin thunk for logging in a user. It sends username and password to the server,
// and handles the response similarly to the signup thunk.
export const signin = createAsyncThunk(signinRoute, async ({username, password}, thunkAPI) => {
  try {
    // Send a POST request to the server with the user's credentials
    await axios.post(signinRoute, {username, password}, { withCredentials: true });
    return { isAuthenticated: true };
  } catch (error) {
    console.error(error);
    return thunkAPI.rejectWithValue(error.message);  
  }
})

// logout thunk for logging out a user. It sends a POST request to the server to invalidate the user's session.
export const logout = createAsyncThunk(logoutRoute, async (_, thunkAPI) => {
  try {
    await axios.post(logoutRoute, {}, { withCredentials: true });
    // console.log('Logout response:', response);
    return {}; // Return an empty object or any relevant data on successful logout
  } catch (error) {
    // console.error('Logout error:', error);
    return thunkAPI.rejectWithValue(error.message);
  }
});

// Initial state for the auth slice, setting up default values for user authentication status.
const initialState = {  
  token: null,
  userID: null,
  // TODO: Remove user param after implementing token and userID in state
  user: '',
  isAuthenticated: false,
  loading: false,
  error: null
};

// authSlice defines the Redux slice for authentication, including reducers for state changes
// and extraReducers for handling the lifecycle of async actions defined above.
export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthState: (state, action) => {
      state.isAuthenticated = action.payload.isAuthenticated;
      state.userID = action.payload.userID;
      state.username = action.payload.username;
    },
  },
  extraReducers: (builder) => {
    builder
      // Handling the pending, fulfilled, and rejected states of signup and signin thunks,
      // adjusting the auth state based on the outcome of these asynchronous operations.
      .addCase(signup.pending, (state, action) => {
        state.loading = true; 
        state.error = null;
      })
      .addCase(signup.fulfilled, (state, action) => {
        state.loading = false;  
        state.user = action.payload.username;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(signup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(signin.pending, (state, action) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signin.fulfilled, (state, action) => {
        state.loading = false;  
        state.isAuthenticated = action.payload.isAuthenticated; 
        state.userID = action.payload.userID;
        state.username = action.payload.username;
        state.error = null;
      })
      .addCase(signin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(logout.fulfilled, (state) => {
        // console.log('Executing logout.fulfilled reducer');
        // Reset the authentication state
        state.token = null;
        state.isAuthenticated = false;
        state.loading = false;
        state.error = null;
      })
  }
});

// Exports the logout action for use in components and the reducer function for the Redux store.
export const { setUser, setToken, setLoading, setError, setAuthState } = authSlice.actions;
export default authSlice.reducer;