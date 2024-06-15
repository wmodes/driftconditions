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
      const noAuthPages = [ 'error', 'notauth' ];
      // Immediately set authChecked to true for no-auth pages and return
      if (noAuthPages.includes(context.toLowerCase())) {
        dispatch(setAuthChecked({ authChecked: true })); 
        // console.log("No auth check needed for this page:", context);
        return;
      }

      try {
        const actionResult = await dispatch(checkPageAuth({context}));
        const result = actionResult.payload;

        // Handle the result
        if (result.error) {
          // Handle not_authenticated error
          if (result.error.reason === "not_authenticated" && context !== "homepage") {
            navigate('/signin');
          } 
          // Handle not_authorized error
          else if (result.error.reason === "not_authorized") {
            navigate('/notauth');
          }
        } else {
          // Successful auth check
          dispatch(setAuthChecked({ authChecked: true }));
        }
      } catch (error) {
        // Handle dispatch error
        console.error("Auth check failed:", error);
        // if we are not on the homepage send to signin
        if (context !== "homepage") {
          navigate('/signin'); // Fallback navigation in case of error
        } 
        // if we ARE on the homepage, allow the user to continues
        else {
          dispatch(setAuthChecked({ authChecked: true }));
        }
      }
    };

    performAuthCheck();
  }, [context, dispatch, navigate]);
};