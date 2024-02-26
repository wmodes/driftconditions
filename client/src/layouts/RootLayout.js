import React, { useEffect } from 'react';
import Navigation from '../components.js/Navigation'; // Adjust the path if necessary
import { Outlet } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import axios from 'axios';
import { setAuthState } from '../store/authSlice'; 

export default function RootLayout() {
  const dispatch = useDispatch();

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Use Axios to make a POST request
        const response = await axios.post('http://localhost:8080/api/auth/check', {}, {
          withCredentials: true, // Ensure credentials are sent with the request
        });

        // console.log('RootLayout: response', response);
        // Dispatch an action to set isAuthenticated in your Redux store
        dispatch(setAuthState({ isAuthenticated: response.data.isAuthenticated }));
      } catch (error) {
        console.error('Error checking authentication status:', error);
        // Set isAuthenticated to false in case of error
        dispatch(setAuthState({ isAuthenticated: false }));
      }
    };

    checkAuthStatus();
  }, [dispatch]);

  // Renders the Navigation bar at the top and an Outlet for nested routes
  // The Outlet component will render the component for the currently matched route as defined in the routing setup
  return (
    <div>
      <Navigation />
      <Outlet />
    </div>
  );
}
