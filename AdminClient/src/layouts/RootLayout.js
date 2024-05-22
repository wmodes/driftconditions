// RootLayout.js - The root component of the app

import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { getPageContext, useAuthCheckAndNavigate } from '../utils/authUtils';
import { getProjectName } from '../utils/randomUtils';
import { setProjectName } from '../store/appSlice';
import Navigation from '../components/Navigation';
import { Outlet } from 'react-router-dom';
import Waiting from '../utils/appUtils';

const RootLayout = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const projectName = getProjectName();
  const authChecked = useSelector(state => state.auth.authChecked);
  const currentPath = location.pathname;
  
  // Get the page context based on the current path
  const pageContext = getPageContext(currentPath);

  // check user authentication and authorization
  useAuthCheckAndNavigate(pageContext);

  useEffect(() => {
    // Ensure a project name is set or retrieved on app initialization
    if (!projectName) {
      const projectName = getProjectName();
      dispatch(setProjectName({projectName}));
    }
  }, [dispatch, projectName]);

  if (!authChecked) {
    return (<Waiting />);
  }

  return (
    <div>
      <Navigation />
      <Outlet />
    </div>
  );
}

export default RootLayout;
