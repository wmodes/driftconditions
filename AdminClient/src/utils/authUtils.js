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
      const noAuthPages = ['error', 'notauth', 'homepage', 'signup', 'signin'];

      // Check and allow public pages without requiring re-authentication
      if (noAuthPages.includes(context.toLowerCase())) {
        if (!authChecked) dispatch(setAuthChecked({ authChecked: true }));
        return;
      }

      // For protected pages, verify session if authChecked is false
      if (!authChecked) {
        try {
          const actionResult = await dispatch(checkPageAuth({ context }));
          const result = actionResult.payload;

          if (result.error) {
            if (result.error.reason === "not_authenticated") {
              dispatch(setAuthChecked({ authChecked: false }));
              navigate('/signin');
            } else if (result.error.reason === "not_authorized") {
              dispatch(setAuthChecked({ authChecked: false }));
              navigate('/notauth');
            }
          } else {
            dispatch(setAuthChecked({ authChecked: true }));
          }
        } catch (error) {
          console.error("Auth check failed:", error);
          dispatch(setAuthChecked({ authChecked: false }));
          navigate('/signin');
        }
      }
    };

    performAuthCheck();
  }, [authChecked, context, dispatch, navigate]);
};
