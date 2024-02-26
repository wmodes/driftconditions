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
    return thunkAPI.rejectWithValue(error.message);  
  }
});

// signin thunk for logging in a user. It sends username and password to the server,
// and handles the response similarly to the signup thunk.
export const signin = createAsyncThunk('auth/signin', async ({username, password}, thunkAPI) => {
  try {
    // Send a POST request to the server with the user's credentials
    await axios.post('http://localhost:8080/signin', {username, password}, { withCredentials: true });
    return { isAuthenticated: true };
  } catch (error) {
    console.error(error);
    return thunkAPI.rejectWithValue(error.message);  
  }
})

// logout thunk for logging out a user. It sends a POST request to the server to invalidate the user's session.
export const logout = createAsyncThunk('auth/logout', async (_, thunkAPI) => {
  try {
    await axios.post('http://localhost:8080/logout', {}, { withCredentials: true });
    // console.log('Logout response:', response);
    return {}; // Return an empty object or any relevant data on successful logout
  } catch (error) {
    // console.error('Logout error:', error);
    return thunkAPI.rejectWithValue(error.message);
  }
});

// fetchUserProfile thunk for fetching the logged-in user's profile information.
export const fetchProfile = createAsyncThunk('auth/fetchUserProfile', async (_, thunkAPI) => {
  try {
    // Assuming your server is set to respond to GET or POST requests at /profile endpoint.
    // Adjust the method (GET/POST) and headers as necessary for your API.
    const response = await axios.post('http://localhost:8080/profile', {}, { withCredentials: true });
    return response.data; // Assuming the response body contains the profile data
  } catch (error) {
    console.error('Fetch profile error:', error);
    return thunkAPI.rejectWithValue(error.message);
  }
});

// update profile thunk for updating user profile. Utilizes Axios for posting user data to the server.
// On success or failure, it either returns the user data or rejects with an error message.
export const updateProfile = createAsyncThunk(
  'auth/profileUpdate',
  async (userData, thunkAPI) => {
    console.log('authSlice updateProfile running')
    try {
      // The userData parameter is expected to be an object containing the fields
      // to be updated. It can include any user profile field such as password,
      // firstname, lastname, email, bio, location, and url.

      // Construct the URL for your API endpoint
      const url = 'http://localhost:8080/profile/update';

      // Make a POST request to the server with the userData
      const response = await axios.post(url, userData, { withCredentials: true });
      console.log('updateProfile response:', response);

      // On success, the response data (presumably the updated user profile) is returned
      return response.data;
    } catch (error) {
      console.error('updateProfile error:', error); 
      // If the request fails, thunkAPI.rejectWithValue is used to return a rejected action
      // containing the error message. This allows for error handling in the reducer.
      return thunkAPI.rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

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
        state.error = null;
        // Since the user object is no longer being stored, there's no need to update anything related to it here.
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