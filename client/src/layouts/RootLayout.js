import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import Navigation from '../components.js/Navigation'; 
import { Outlet } from 'react-router-dom';
import { setAuthState } from '../store/authSlice'; 
import { setProjectName } from '../store/appSlice';
import { getProjectName } from '../utils/textUtils';

export default function RootLayout() {
  const dispatch = useDispatch();
  // Access projectName from the global state
  const projectName = useSelector(state => state.app.projectName);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Use Axios to make a POST request
        const response = await axios.post('http://localhost:8080/api/auth/check', {}, {
          withCredentials: true, // Ensure credentials are sent with the request
        });
        // console.log('RootLayout: userID:', response.data.userID);
        // console.log('RootLayout: username:', response.data.username);
        // Update your Redux store or component state with authentication status, userID, and username
        dispatch(setAuthState({
          isAuthenticated: response.data.isAuthenticated,
          userID: response.data.userID,
          username: response.data.username
        }));
      } catch (error) {
        console.error('Error checking authentication status:', error);
        // Set isAuthenticated to false in case of error, and clear userID and username
        dispatch(setAuthState({
          isAuthenticated: false,
          userID: null,
          username: null
        }));
      }
    };

    // Check the authentication status on app initialization
    checkAuthStatus();
    
    // Ensure a project name is set or retrieved on app initialization
    if (!projectName) {
      const name = getProjectName();
      dispatch(setProjectName(name));
    }

  }, [dispatch, projectName]);



  // Renders the Navigation bar at the top and an Outlet for nested routes
  // The Outlet component will render the component for the currently matched route as defined in the routing setup
  return (
    <div>
      <Navigation />
      <Outlet />
    </div>
  );
}
