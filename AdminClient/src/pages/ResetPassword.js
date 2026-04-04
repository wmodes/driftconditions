// ResetPassword.js — user sets a new password using the token from their reset email.

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import config from '../config/config';
const serverBaseURL = config.adminServer.baseURL;

function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = new URLSearchParams(location.search).get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!token) {
    return (
      <div className="signin-wrapper">
        <div className="display-box-wrapper">
          <div className="display-box">
            <h2 className='title'>Invalid link</h2>
            <p className="text-center">This reset link is missing or malformed.</p>
            <p className="text-center text-sm text-gray-500 mt-4">
              <a href="/forgot-password" className="link">Request a new reset link</a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    try {
      const res = await fetch(`${serverBaseURL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      if (res.ok) {
        setSuccess('Password updated! Redirecting to sign in...');
        setTimeout(() => navigate('/signin'), 2000);
      } else {
        const data = await res.json();
        setError(data?.error?.message || 'Reset failed. The link may have expired.');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    }
  };

  const isFormValid = password && confirmPassword;

  return (
    <div className="signin-wrapper">
      <div className="display-box-wrapper">
        <div className="display-box">
          <form onSubmit={handleSubmit}>
            <h2 className='title'>Reset your password</h2>
            <label className="form-label" htmlFor="password">New Password:</label>
            <input
              className="form-field"
              type="password"
              id="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <label className="form-label" htmlFor="confirmPassword">Confirm Password:</label>
            <input
              className="form-field"
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
            />
            <div className='button-box'>
              <a href="/signin" className='button cancel'>Cancel</a>
              <button className='button submit' type="submit" disabled={!isFormValid}>Set Password</button>
            </div>
            <div className='message-box'>
              {success && <p className="success">{success}</p>}
              {error && <p className="error">{error}</p>}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
