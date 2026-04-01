// ForgotPassword.js — user enters their email to request a password reset link.

import { useState } from 'react';
import config from '../config/config';
const serverBaseURL = config.adminServer.baseURL;

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await fetch(`${serverBaseURL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      // Always show success regardless of whether email exists (prevents enumeration)
      setSubmitted(true);
    } catch (err) {
      setError('Something went wrong. Please try again.');
    }
  };

  return (
    <div className="signin-wrapper">
      <div className="display-box-wrapper">
        <div className="display-box">
          {submitted ? (
            <div>
              <h2 className='title'>Check your email</h2>
              <p className="text-center">If that email is registered, we've sent a password reset link. Check your inbox.</p>
              <p className="text-center text-sm text-gray-500 mt-4">
                <a href="/signin" className="link">Back to sign in</a>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h2 className='title'>Forgot password?</h2>
              <p className="text-center text-sm text-gray-500 mb-4">Enter your email and we'll send you a reset link.</p>
              <label className="form-label" htmlFor="email">Email:</label>
              <input
                className="form-field"
                type="email"
                id="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <div className='button-box'>
                <a href="/signin" className='button cancel'>Cancel</a>
                <button className='button submit' type="submit" disabled={!email}>Send Reset Link</button>
              </div>
              <div className='message-box'>
                {error && <p className="error">{error}</p>}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
