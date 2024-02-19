import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'; 
import axios from 'axios';

export const signup = createAsyncThunk('auth/signup', async ({username, password, firstname, lastname, email}, thunkAPI) => {
  try {
    const res = await axios.post('http://localhost:8080/signup', {username, password, firstname, lastname, email})
    return res.data;
  } catch (err) {
    console.log(err);
    return thunkAPI.rejectWithValue(err.message);  
  }
})

const initialState = {
  user: '',
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // setUser: (state, action) => {
    //   state.user = action.payload;
    //   state.isAuthenticated = true;
    // },
    // setToken: (state, action) => {
    //   state.token = action.payload;
    // },
    // setLoading: (state, action) => {
    //   state.loading = action.payload;
    // },
    // setError: (state, action) => {
    //   state.error = action.payload;
    // },
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
  }
});

export const { setUser, setToken, setLoading, setError, logout } = authSlice.actions;

export default authSlice.reducer;