import { configureStore } from '@reduxjs/toolkit';

const dummyReducer = (state = { test: 'working' }) => state;

export const store = configureStore({
  reducer: {
    dummy: dummyReducer
  },
});
