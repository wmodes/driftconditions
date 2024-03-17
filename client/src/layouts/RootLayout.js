

import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { setProjectName } from '../store/appSlice';
import { getPageContext, useAuthCheckAndNavigate } from '../utils/authUtils';
import { getProjectName } from '../utils/textUtils';
import Navigation from '../components/Navigation';
import { Outlet } from 'react-router-dom';
import Waiting from '../utils/appUtils';

const RootLayout = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const projectName = useSelector(state => state.app.projectName);
  const authChecked = useSelector(state => state.auth.authChecked);
  const currentPath = location.pathname;
  
  // Get the page context based on the current path
  const pageContext = getPageContext(currentPath);
  console.log('pageContext:', pageContext);
  // check user authentication and authorization
  useAuthCheckAndNavigate(pageContext);
  console.log('RootLayout authChecked:', authChecked);

  useEffect(() => {
    // Ensure a project name is set or retrieved on app initialization
    if (!projectName) {
      const name = getProjectName();
      dispatch(setProjectName(name));
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
