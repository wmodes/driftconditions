// The Signin component facilitates user login, interacting with Redux for state management and react-router-dom for navigation post-login.

// React's useState hook for managing form inputs.
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
// Hooks for dispatching actions and accessing Redux state.
import { useDispatch } from 'react-redux';
// signin async thunk for authentication.
import { signin, checkPageAuth } from '../store/authSlice';
// config for reCAPTCHA site key and server URL
import config from '../config/config';
const recaptchaSiteKey = config.recaptcha.siteKey;
const serverBaseURL = config.adminServer.baseURL;

// Map OAuth error codes (from ?error= query param) to user-facing messages
const OAUTH_ERRORS = {
  NO_EMAIL:             'Your account with that provider has no verified email address. Please use another sign-in method.',
  INVALID_STATE:        'Login session expired or was tampered with. Please try again.',
  OAUTH_EXCHANGE_FAILED:'Sign-in failed due to a provider error. Please try again.',
};

function Signin() {
  const navigate = useNavigate();
  const location = useLocation();

  // Dynamically load reCAPTCHA script only while this component is mounted
  useEffect(() => {
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${recaptchaSiteKey}`;
    script.async = true;
    document.head.appendChild(script);
    return () => {
      // Remove the script and the injected badge on unmount
      document.head.removeChild(script);
      const badge = document.querySelector('.grecaptcha-badge');
      if (badge) badge.remove();
    };
  }, []);

  // Local state for managing form inputs.
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Pre-populate error from OAuth redirect query param (e.g. ?error=NO_EMAIL)
  const oauthError = new URLSearchParams(location.search).get('error');
  const [error, setError] = useState(OAUTH_ERRORS[oauthError] || '');

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
          .then((signinData) => {
            setUsername('');
            setPassword('');
            // Use the username returned by the server (input may have been an email)
            const actualUsername = signinData?.username || username;
            // Hydrate Redux state with user/role info before navigating
            const next = new URLSearchParams(location.search).get('next');
            dispatch(checkPageAuth({ context: 'profile' })).finally(() => {
              if (next) {
                navigate(next);
              } else if (!signinData?.profileComplete) {
                navigate(`/profile/edit`);
              } else {
                navigate(`/profile/${actualUsername}`);
              }
            });
          })
          .catch((error) => {
            console.error("Login error:", error);
            setError('Invalid username or password.');
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
            <label className="form-label" htmlFor="username">Username or Email:</label>
            <input className="form-field" type="text" id="username" value={username} onChange={e => setUsername(e.target.value)} />
            <label className="form-label"  htmlFor="password">Password:</label>
            <input className="form-field" type="password" id="password" value={password} onChange={e => setPassword(e.target.value)} />
            <div className='button-box'>
              <button className='button cancel' type="button">Cancel</button>
              <button className='button submit' type="submit">Log In</button>
            </div>
            <div className='message-box'>
              {error && <p className="error">{error}</p>}
            </div>
          </form>

          <div className="oauth-divider">
            <span>or</span>
          </div>

          <div className="oauth-buttons">
            <a href={`${serverBaseURL}/api/auth/google`} className="oauth-button" >
              <svg className="oauth-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </a>
            <a href={`${serverBaseURL}/api/auth/github`} className="oauth-button">
              <svg className="oauth-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836a9.59 9.59 0 012.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" fill="currentColor"/>
              </svg>
              Continue with GitHub
            </a>
            <a href={`${serverBaseURL}/api/auth/discord`} className="oauth-button oauth-button--discord">
              <svg className="oauth-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" fill="#5865F2"/>
              </svg>
              Continue with Discord
            </a>
          </div>

          <div className="oauth-divider">
            <span>or</span>
          </div>
          <p className="text-center text-sm text-gray-500">
            <a href="/forgot-password" className="link">Forgot password?</a>
          </p>
          <p className="text-center text-sm text-gray-500">
            Need an account? <a href="/signup" className="link">Sign up</a>
          </p>
        </div>
      </div>
    </div>
  );
}

// Exports the Signin component for use elsewhere in the app.
export default Signin;
