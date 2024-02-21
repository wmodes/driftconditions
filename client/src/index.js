import React from 'react';
import ReactDOM from 'react-dom/client';

// Importing React and ReactDOM for UI rendering, and essential React Router and Redux functionalities.
import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider } from 'react-router-dom';
// Importing the Redux store setup from its definition.
import { store } from './store/store';
// Redux Provider to make the store available to all components.
import { Provider } from 'react-redux';
import './index.css';
import App from './App';
// Signup page component.
import Signup from './pages/Signup';
// Signin page component.
import Signin from './pages/Signin';
// User profile page component.
import Profile from './pages/Profile';
// Error page component for handling unmatched routes.
import Error from './pages/Error';
// Layout component that wraps around the entire application.
import RootLayout from './layouts/RootLayout';

// Defining application routes using React Router. The structure shows nested routes where `RootLayout` acts as a layout wrapper for other components.
const router = createBrowserRouter(
  createRoutesFromElements((
    <Route path='/' element={<RootLayout />}>
      <Route path='/' element={<App />} />
      <Route path='/signup' element={<Signup />} />
      <Route path='/signin' element={<Signin />} />
      <Route path='/profile' element={<Profile />} /> 
      <Route path='*' element={<Error />} /> 
    </Route>
  )
))

// Mounting the React application to the DOM and wrapping the entire app with `Provider` to pass down the Redux store, and `RouterProvider` to manage routing throughout the app. This setup enables a single-page application behavior with Redux state management and route handling.
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  </React.StrictMode>
);

