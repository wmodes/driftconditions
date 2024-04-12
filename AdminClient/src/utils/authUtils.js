// authUtils - a custom hook to check the user's authentication status

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { checkPageAuth, setAuthChecked } from '../store/authSlice';

// Import the config object from the config.js file
import config from '../config/config';
// pull variables from the config object
const pagePaths = config.adminClient.pages;

export const getPageContext = (URLpath) => {
  let matchedKey //= 'homepage'; // Default to 'homepage' if no matches are found
  
  Object.entries(pagePaths).forEach(([key, path]) => {
    if (URLpath === path || URLpath.startsWith(path + '/') || (path === '/' && URLpath === '')) {
      matchedKey = key;
      // console.log("Matched key:", matchedKey, "for path:", URLpath);
    }
  });
  if (!matchedKey) {
    matchedKey = 'error';
  }
  
  return matchedKey;
};

export const useAuthCheckAndNavigate = (context) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    const performAuthCheck = async () => {
      // No need to check auth for error pages
      const noAuthPages = ['error', 'notauth'];
      // Immediately set authChecked to true for no-auth pages and return
      if (noAuthPages.includes(context.toLowerCase())) {
        dispatch(setAuthChecked({ authChecked: true })); 
        // console.log("No auth check needed for this page:", context);
        return;
      }

      try {
        const actionResult = await dispatch(checkPageAuth({context}));
        const result = actionResult.payload;
        // console.log("Auth check result:", result);
        dispatch(setAuthChecked({ authChecked: true }));

        // Based on the result, navigate accordingly
        if (result.status === 403 && result.data.error.reason === "not_authenticated") {
          navigate('/signin');
        } else if (result.status === 403 && result.data.error.reason === "not_authorized") {
          navigate('/notauth');
        }
      } catch (error) {
        dispatch(setAuthChecked({ authChecked: true }));
        console.error("Auth check failed:", error);
        navigate('/signin'); // Fallback navigation in case of error
      }
    };

    performAuthCheck();
  }, [context, dispatch, navigate]);
};