// appSlice.js
import { createSlice } from '@reduxjs/toolkit';

// Initial state for the app slice
export const appSlice = createSlice({
  name: 'app',
  initialState: {
    projectName: null,
  },
  reducers: {
    setProjectName: (state, action) => {
      state.projectName = action.payload;
    },
  },
});

// Export the action creators
export const { setProjectName } = appSlice.actions;

// Export the reducer
export default appSlice.reducer;
