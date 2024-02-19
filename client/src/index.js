import React from 'react';
import ReactDOM from 'react-dom/client';

// Importing React and ReactDOM for UI rendering, and essential React Router and Redux functionalities.
import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider } from 'react-router-dom';
import { store } from './store/store'; // Importing the Redux store setup from its definition.
import { Provider } from 'react-redux'; // Redux Provider to make the store available to all components.

// Importing CSS for global styles and components for routing.
import App from './App'; // The main application component.
import Signup from './pages/Signup'; // Signup page component.
import Signin from './pages/Signin'; // Signin page component.
import Profile from './pages/Profile'; // User profile page component.
import Error from './pages/Error'; // Error page component for handling unmatched routes.
import RootLayout from './layouts/RootLayout'; // Layout component that wraps around the entire application.

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

