// RootLayout.js - The root component of the app

import React, { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useLocation, Outlet } from 'react-router-dom';
import { getPageContext, useAuthCheckAndNavigate } from '../utils/authUtils';
import AudioPlayer from '../components/AudioPlayer'; 
import { getProjectName } from '../utils/randomUtils';
import { setProjectName } from '../store/appSlice';
import Navigation from '../components/Navigation';
import { Waiting } from '../utils/appUtils';

const RootLayout = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const projectName = getProjectName();
  const authChecked = useSelector(state => state.auth.authChecked);
  const currentPath = location.pathname;

  const [isPlayerVisible, setIsPlayerVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioPlayerRef = useRef(null); // Create a ref for AudioPlayer
  
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

  const togglePlayer = () => {
    setIsPlayerVisible(true);
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
      <Navigation />
      <Outlet context={{ togglePlayer, isPlaying, setIsPlaying }} />
      <AudioPlayer ref={audioPlayerRef} isVisible={isPlayerVisible} setIsPlaying={setIsPlaying} />
    </div>
  );
}

export default RootLayout;
