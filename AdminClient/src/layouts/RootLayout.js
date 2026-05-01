// RootLayout.js - The root component of the app

import React, { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useLocation, Outlet } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { getPageContext, useAuthCheckAndNavigate } from '../utils/authUtils';
import AudioPlayer from '../components/AudioPlayer';
import { getProjectName } from '../utils/randomUtils';
import { setProjectName } from '../store/appSlice';
import Navigation from '../components/Navigation';
import { Waiting } from '../utils/appUtils';
import brand from '../brand/brand';

const RootLayout = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const projectName = getProjectName();
  const authChecked = useSelector(state => state.auth.authChecked);
  const user = useSelector(state => state.auth.user);
  const currentPath = location.pathname;

  const [isScrolled, setIsScrolled] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioPlayerRef = useRef(null); // Create a ref for AudioPlayer

  // Get the page context based on the current path
  const pageContext = getPageContext(currentPath);
  const isHomepage = pageContext.toLowerCase() === 'homepage';

  // show bar on all non-homepage pages; on homepage only when scrolled past the faux player
  const showBar = !isHomepage || isScrolled;

  // check user authentication and authorization
  useAuthCheckAndNavigate(pageContext);

  useEffect(() => {
    // Ensure a project name is set or retrieved on app initialization
    if (!projectName) {
      const projectName = getProjectName();
      dispatch(setProjectName({projectName}));
    } 
  }, [dispatch, projectName]);

  const noAuthPages = ['error', 'notauth', 'homepage', 'signup', 'signin',
                       'forgotpassword', 'resetpassword', 'howitworks', 'profile'];
  const isPublicPage = noAuthPages.includes(pageContext.toLowerCase());

  if (!authChecked) return <Waiting />;
  // Hold the render for protected pages until redirect fires
  if (!isPublicPage && !user?.userID) return <Waiting />;

  const togglePlayer = () => {
    if (audioPlayerRef.current) {
      if (isPlaying) {
        audioPlayerRef.current.pause(); // Trigger pause method on the AudioPlayer
      } else {
        audioPlayerRef.current.play(); // Trigger play method on the AudioPlayer
      }
    }
  };

  return (
    <div>
      <Helmet>
        <title>{brand.name}: {brand.tagline}</title>
        <meta name="description" content={brand.descriptionFull} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={brand.siteUrl} />
        <meta property="og:title" content={brand.name} />
        <meta property="og:description" content={brand.descriptionLong} />
        <meta property="og:image" content={brand.ogImage} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={brand.siteUrl} />
        <meta name="twitter:title" content={brand.name} />
        <meta name="twitter:description" content={brand.descriptionFull} />
        <meta name="twitter:image" content={brand.ogImage} />
      </Helmet>
      <Navigation />
      <Outlet context={{ togglePlayer, isPlaying, setIsPlaying, setIsScrolled }} />
      <AudioPlayer ref={audioPlayerRef} showBar={showBar} isPlaying={isPlaying} setIsPlaying={setIsPlaying} togglePlayer={togglePlayer} />
    </div>
  );
}

export default RootLayout;
