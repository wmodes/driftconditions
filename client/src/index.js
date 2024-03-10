  import React from 'react';
  import ReactDOM from 'react-dom/client';

  // Importing React and ReactDOM for UI rendering, and essential React Router and Redux functionalities.
  import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider } from 'react-router-dom';
  // Importing the Redux store setup from its definition.
  import { store } from './store/store';
  // Redux Provider to make the store available to all components.
  import { Provider } from 'react-redux';
  import './index.css';
  // import App from './App';

  // Page components
  import Homepage from './pages/Homepage';
  import Signup from './pages/Signup';
  import Signin from './pages/Signin';
  import Profile from './pages/Profile';
  import ProfileEdit from './pages/ProfileEdit';
  import UserList from './pages/UserList';
  import AudioUpload from './pages/AudioUpload';
  import AudioList from './pages/AudioList';
  import AudioView from './pages/AudioView';
  import AudioEdit from './pages/AudioEdit';
  import Error from './pages/Error';
  import RootLayout from './layouts/RootLayout';

  // Just for testing purposes
  // import { configureStore } from '@reduxjs/toolkit';
  // import rootReducer from './store/authSlice'; // Adjust the import path according to your project structure
  // import { logout } from './store/authSlice';

  // Making the store accessible in the browser's console for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log("Redux store available at window.store");

    // const store = configureStore({ reducer: rootReducer });
    // Temporarily expose the store for debugging
    window.store = store;

    // window.logout = () => store.dispatch(logout());
  }

  // Defining application routes using React Router. The structure shows nested routes where `RootLayout` acts as a layout wrapper for other components.
  const router = createBrowserRouter(
    createRoutesFromElements((
      <Route path='/' element={<RootLayout />}>
        <Route path='/' element={<Homepage />} />
        <Route path='/signup' element={<Signup />} />
        <Route path='/signin' element={<Signin />} />
        <Route path='/profile' element={<Profile />} /> 
        <Route path="/profile/:username" element={<Profile />} />
        <Route path='/profile/edit' element={<ProfileEdit />} /> 
        <Route path='/user/list' element={<UserList />} />
        <Route path='/audio/upload' element={<AudioUpload />} />
        <Route path='/audio/list' element={<AudioList />} /> 
        <Route path='/audio/view/:audioID' element={<AudioView />} />
        <Route path='/audio/edit/:audioID' element={<AudioEdit />} />
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

