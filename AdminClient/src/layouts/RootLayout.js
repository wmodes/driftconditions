// RootLayout.js - The root component of the app

import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { getPageContext, useAuthCheckAndNavigate } from '../utils/authUtils';
import { getProjectName, getHeroImageURL } from '../utils/randomUtils';
import { setProjectName } from '../store/appSlice';
import Navigation from '../components/Navigation';
import { Outlet } from 'react-router-dom';
import Waiting from '../utils/appUtils';

const RootLayout = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const projectName = getProjectName();
  const heroImageURL = getHeroImageURL();
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
      <Helmet>
        {/* Primary Meta Tags */}
        <title>{projectName} - The Uncanny Sound of Serendipity</title>
        <meta name="title" content={projectName} />
        <meta name="description" content="An online audio station where mysterious soundscapes meet the chaos and serendipity of late-night radio tuning." />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://driftconditions.org" />
        <meta property="og:title" content={projectName} />
        <meta property="og:description" content="An online audio station where mysterious soundscapes meet the chaos and serendipity of late-night radio tuning." />
        <meta property="og:image" content={heroImageURL} />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://driftconditions.org" />
        <meta name="twitter:title" content={projectName} />
        <meta name="twitter:description" content="An online audio station where mysterious soundscapes meet the chaos and serendipity of late-night radio tuning." />
        <meta name="twitter:image" content={heroImageURL} />
      </Helmet>
      <Navigation />
      <Outlet />
    </div>
  );
}

export default RootLayout;
