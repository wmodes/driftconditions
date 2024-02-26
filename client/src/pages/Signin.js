// The Signin component facilitates user login, interacting with Redux for state management and react-router-dom for navigation post-login.

// React's useState hook for managing form inputs.
import { useState } from 'react';
// Hooks for dispatching actions and accessing Redux state.
import { useDispatch, useSelector } from 'react-redux';
// signin async thunk for authentication.
import { signin } from '../store/authSlice';
// Navigate component for redirecting the user upon successful login.
import { Navigate } from 'react-router-dom';

function Signin() {
  // Local state for managing form inputs.
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  // Accessing the global state to check for current user and any authentication errors.
  // Instead of selecting `user`, select the authentication status flag
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const error = useSelector((state) => state.auth.error);
  // Hook to dispatch authentication action.
  const dispatch = useDispatch(); 

  // Handles form submission, dispatching the signin action and resetting form fields.
  const submitHandler = e => {
    e.preventDefault(); // Prevents the default form submission behavior.
    dispatch(signin({username, password}))
    .unwrap() // Unwraps the result of the thunk execution to handle it directly.
    .then(() => {
      // Proceed with resetting form fields or redirecting the user
      setUsername('');
      setPassword('');
    })
    .catch((error) => {
        // Handle any error here
        console.error("Login error:", error);
    });
}

  // Renders the sign-in form. Uses conditional rendering for displaying errors and redirecting on successful login.
  return (
    <div class="sigin-wrapper">
      <div class="display-box-wrapper">
        <div class="display-box">
          <form onSubmit={submitHandler}>
            <h2 class='title'>Sign In</h2>
            <label class="form-label" htmlFor="username">Username:</label>
            <input class="form-field" type="text" id="username" value={username} onChange={e => setUsername(e.target.value)} />
            <label class="form-label"  htmlFor="password">Password:</label>
            <input class="form-field" type="password" id="password" value={password} onChange={e => setPassword(e.target.value)} />
            <div class='button-box'>
              <button class='button cancel' type="button">Cancel</button>
              <button class='button submit' type="submit">SignIn</button>
            </div>
            <div class='error-box'>
              {error && <p class="error">{error}</p>}
            </div>
            {isAuthenticated ? <Navigate to='/profile' replace={true} /> : null}
          </form>
        </div>
      </div>
    </div>
  );
}

// Exports the Signin component for use elsewhere in the app.
export default Signin;
