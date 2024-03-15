// The Signin component facilitates user login, interacting with Redux for state management and react-router-dom for navigation post-login.

// React's useState hook for managing form inputs.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// Hooks for dispatching actions and accessing Redux state.
import { useDispatch, useSelector } from 'react-redux';
// signin async thunk for authentication.
import { signin } from '../store/authSlice';
import { useCheckAuth } from '../utils/authUtils';
// Navigate component for redirecting the user upon successful login.
import { Navigate } from 'react-router-dom';

function Signin() {
  useCheckAuth('signin');
  const navigate = useNavigate();
  // Local state for managing form inputs.
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  
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
      navigate(`/profile/${username}`);
    })
    .catch((error) => {
        // Handle any error here
        console.error("Login error:", error);
        setError('Invalid username or password');
    });
}

  // Renders the sign-in form. Uses conditional rendering for displaying errors and redirecting on successful login.
  return (
    <div className="sigin-wrapper">
      <div className="display-box-wrapper">
        <div className="display-box">
          <form onSubmit={submitHandler}>
            <h2 className='title'>Sign In</h2>
            <label className="form-label" htmlFor="username">Username:</label>
            <input className="form-field" type="text" id="username" value={username} onChange={e => setUsername(e.target.value)} />
            <label className="form-label"  htmlFor="password">Password:</label>
            <input className="form-field" type="password" id="password" value={password} onChange={e => setPassword(e.target.value)} />
            <div className='button-box'>
              <button className='button cancel' type="button">Cancel</button>
              <button className='button submit' type="submit">SignIn</button>
            </div>
            <div className='message-box'>
              {error && <p className="error">{error}</p>}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Exports the Signin component for use elsewhere in the app.
export default Signin;
