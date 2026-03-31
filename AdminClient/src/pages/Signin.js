// The Signin component facilitates user login, interacting with Redux for state management and react-router-dom for navigation post-login.

// React's useState hook for managing form inputs.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// Hooks for dispatching actions and accessing Redux state.
import { useDispatch } from 'react-redux';
// signin async thunk for authentication.
import { signin, checkPageAuth } from '../store/authSlice';
// config for reCAPTCHA site key
import config from '../config/config';
const recaptchaSiteKey = config.recaptcha.siteKey;

function Signin() {
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
    // Execute reCAPTCHA v3 to get a token before submitting credentials
    window.grecaptcha.ready(() => {
      window.grecaptcha.execute(recaptchaSiteKey, { action: 'signin' }).then(recaptchaToken => {
        dispatch(signin({username, password, recaptchaToken}))
          .unwrap()
          .then(() => {
            setUsername('');
            setPassword('');
            // Hydrate Redux state with user/role info before navigating
            dispatch(checkPageAuth({ context: 'profile' })).finally(() => {
              navigate(`/profile/${username}`);
            });
          })
          .catch((error) => {
            console.error("Login error:", error);
            setError('Invalid username or password');
          });
      });
    });
  };

  // Renders the sign-in form. Uses conditional rendering for displaying errors and redirecting on successful login.
  return (
    <div className="signin-wrapper">
      <div className="display-box-wrapper">
        <div className="display-box">
          <form onSubmit={submitHandler}>
            <h2 className='title'>Log in</h2>
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
