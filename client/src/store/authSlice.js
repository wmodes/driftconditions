//This script integrates asynchronous operations for user authentication within a Redux state management setup, highlighting the use of createAsyncThunk for API interactions and the structuring of response and error handling to maintain the application's state.

// This file defines asynchronous actions for user authentication using Redux Toolkit's createAsyncThunk, facilitating side effects like API calls with Axios for a streamlined async flow within Redux.
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'; 
import axios from 'axios';

// createAsyncThunk is used to handle asynchronous logic, allowing for side effects like API calls.
// It automatically manages pending, fulfilled, and rejected action types based on the promise state.

// signup thunk for registering a new user. Utilizes Axios for posting user data to the server.
// On success or failure, it either returns the user data or rejects with an error message.
export const signup = createAsyncThunk('auth/signup', async ({username, password, firstname, lastname, email}, thunkAPI) => {
  try {
    const response = await axios.post('http://localhost:8080/signup', {username, password, firstname, lastname, email});
    return response.data;
  } catch (error) {
    console.log(error); 
    return thunkAPI.rejectWithValue(error.message);  
  }
});

// signin thunk for logging in a user. It sends username and password to the server,
// and handles the response similarly to the signup thunk.
export const signin = createAsyncThunk('auth/signin', async ({username, password}, thunkAPI) => {
  try {
    const response = await axios.post('http://localhost:8080/signin', {username, password})
    return response.data;
  } catch (error) {
    console.log(error);
    return thunkAPI.rejectWithValue(error.message);  
  }
})

// Initial state for the auth slice, setting up default values for user authentication status.
const initialState = {
  userID: null,
  token: null,
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
    // The logout reducer resets the authentication state to its initial values.
    logout: (state, action) => {
      state.user = '';
      state.token = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null; 
    }
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
        state.user = action.payload.username;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(signin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
  }
});

// Exports the logout action for use in components and the reducer function for the Redux store.
export const { setUser, setToken, setLoading, setError, logout } = authSlice.actions;
export default authSlice.reducer;