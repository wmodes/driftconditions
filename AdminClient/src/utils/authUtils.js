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

          if (result && result.data?.error) {
            // Only redirect on auth failure for protected pages
            if (!isPublicPage) {
              const reason = result.data.error.reason;
              const hasUser = result.data.user?.userID;
              if (reason === "not_authenticated" || (reason === "not_authorized" && !hasUser)) {
                // Not logged in — send to signin with return URL
                const next = encodeURIComponent(window.location.pathname + window.location.search);
                navigate(`/signin?next=${next}`);
              } else if (reason === "not_authorized" && hasUser) {
                // Logged in but lacks permission
                navigate('/notauth');
              }
            }
          }
        } catch (error) {
          console.error("Auth check failed:", error);
          if (!isPublicPage) {
            const next = encodeURIComponent(window.location.pathname + window.location.search);
            navigate(`/signin?next=${next}`);
          }
        } finally {
          dispatch(setAuthChecked({ authChecked: true }));
        }
      }
    };

    performAuthCheck();
  }, [authChecked, context, dispatch, navigate]);
};
