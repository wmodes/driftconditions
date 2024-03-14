// authUtils - a custom hook to check the user's authentication status

import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { checkAuthStatus } from '../store/authSlice'; // Import your thunk action creator

export const useCheckAuth = (context) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    const performAuthCheck = async () => {
      try {
        // Dispatch the thunk, passing the context
        const result = await dispatch(checkAuthStatus(context)).unwrap();

        // Based on the thunk's resolved result, navigate accordingly
        if (result.status === 403 && result.message === "not authenticated") {
          navigate('/signin');
        } else if (result.status === 403 && result.message === "not authorized") {
          navigate('/notauth');
        }
        // If status 200, no action needed as the user is authenticated and authorized
      } catch (error) {
        console.error("Auth check failed", error);
        // Handle any unexpected errors here. For example, navigate to an error page or display a message.
      }
    };

    performAuthCheck();
  }, [context, dispatch, navigate]); // Re-run the effect if the context changes
};
