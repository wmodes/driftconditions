// authUtils - a custom hook to check the user's authentication status

import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { checkPageAuth } from '../store/authSlice'; // Import your thunk action creator

export const useCheckAuth = (context) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [authData, setAuthData] = useState(null);

  useEffect(() => {
    const performAuthCheck = async () => {
      try {
        // Dispatch the thunk, passing the context
        const result = await dispatch(checkPageAuth(context)).unwrap();
        console.log("\nresult:", result);
        console.log("\nresult.status:", result.status, "result.error:", result.error); 

        // Based on the thunk's resolved result, navigate accordingly
        if (result.status === 403 && result.error.reason === "not_authenticated") {
          navigate('/signin');
        } else if (result.status === 403 && result.error.reason === "not_authorized") {
          navigate('/notauth');
        } else if (result.status === 200) {
          // If status 200, no action needed as the user is authenticated and authorized
          console.log("authenticated result:", result.data);
          setAuthData(result.data);
        } else {
          // Handle any other unexpected results here
          navigate('/notauth');
        }
        // If status 200, no action needed as the user is authenticated and authorized
      } catch (error) {
        console.error("Auth check failed", error);
        // Handle any unexpected errors here. For example, navigate to an error page or display a message.
        navigate('/signin');
      }
    };

    performAuthCheck();
  }, [context, dispatch, navigate]); // Re-run the effect if the context changes

  return authData;
};
