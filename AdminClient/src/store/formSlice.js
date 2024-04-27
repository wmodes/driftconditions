// formSlice.js
import { createSlice } from '@reduxjs/toolkit';

// Initial state for the form slice
export const formSlice = createSlice({
  name: 'form',
  initialState: {
    unsavedChanges: false,
  },
  reducers: {
    setUnsavedChanges: (state, action) => {
      state.unsavedChanges = action.payload;
    },
  },
});

// Export the action creators
export const { setUnsavedChanges } = formSlice.actions;

// Export the reducer
export default formSlice.reducer;
