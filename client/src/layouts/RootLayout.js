import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { setProjectName } from '../store/appSlice';
import { useCheckAuth } from '../utils/authUtils';
import { getProjectName } from '../utils/textUtils';
import Navigation from '../components.js/Navigation'; // Assuming you have this component
import { Outlet } from 'react-router-dom'; // Assuming you're using react-router

// Import the config object from the config.js file
const config = require('../config/config');
// pull variables from the config object
const pagePaths = config.client.pages;

const RootLayout = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const currentPath = location.pathname;
  const projectName = useSelector(state => state.app.projectName);
  const isAuthenticated = useSelector(state => state.auth.isAuthenticated);
  const userID = useSelector(state => state.auth.userID);
  const username = useSelector(state => state.auth.username);

  // Find the corresponding page context
  const pageContext = Object.keys(pagePaths).find(key => pagePaths[key] === currentPath) || 'homepage';

  // Call useCheckAuth with the determined context
  useCheckAuth(pageContext);

  useEffect(() => {
    // Ensure a project name is set or retrieved on app initialization
    if (!projectName) {
      const name = getProjectName();
      dispatch(setProjectName(name));
    }
  }, [dispatch, projectName]);

  console.log("Auth state in RootLayout:", { isAuthenticated, userID, username });

  return (
    <div>
      <Navigation />
      <Outlet />
    </div>
  );
}

export default RootLayout;
