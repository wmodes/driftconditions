// authUtils.js - Refined version to consistently check authenticated state

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { checkPageAuth, setAuthChecked } from '../store/authSlice';
import config from '../config/config';

const pagePaths = config.adminClient.pages;

export const getPageContext = (URLpath) => {
  let matchedKey;

  Object.entries(pagePaths).forEach(([key, path]) => {
    if (URLpath === path || URLpath.startsWith(path + '/') || (path === '/' && URLpath === '')) {
      matchedKey = key;
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
  const authChecked = useSelector(state => state.auth.authChecked);

  useEffect(() => {
    const performAuthCheck = async () => {
      const noAuthPages = ['error', 'notauth', 'homepage', 'signup', 'signin', 'forgotpassword', 'resetpassword', 'howitworks'];
      const isPublicPage = noAuthPages.includes(context.toLowerCase());

      if (!authChecked) {
        try {
          const actionResult = await dispatch(checkPageAuth({ context }));
          const result = actionResult.payload;

          if (result && result.error) {
            // Only redirect on auth failure for protected pages
            if (!isPublicPage) {
              if (result.error.reason === "not_authenticated") {
                navigate('/signin');
              } else if (result.error.reason === "not_authorized") {
                navigate('/notauth');
              }
            }
          }
        } catch (error) {
          console.error("Auth check failed:", error);
          if (!isPublicPage) navigate('/signin');
        } finally {
          dispatch(setAuthChecked({ authChecked: true }));
        }
      }
    };

    performAuthCheck();
  }, [authChecked, context, dispatch, navigate]);
};
