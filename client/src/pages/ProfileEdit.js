// ProfileEdit.js allows user to edit profile information.

import React, { useEffect, useState } from 'react';
// Hooks for Redux state management and action dispatching, if needed.
import { useDispatch, useSelector } from 'react-redux';
// Assuming you have an action or function to fetch user profile
import { fetchProfile, updateProfile } from '../store/authSlice';
// For redirecting the user in case they are not logged in
import { Navigate } from 'react-router-dom';  

function ProfileEdit() {

  const mutableFields = [
    { key: 'firstname', label: 'First Name' },
    { key: 'lastname', label: 'Last Name' },
    { key: 'email', label: 'Email' },
    { key: 'bio', label: 'Biography' },
    { key: 'location', label: 'Location' },
    { key: 'url', label: 'Your Website URL' }
  ];

  const [profile, setProfile] = useState({
    username: '',
    firstname: '',
    lastname: '',
    email: '',
    bio: '',
    location: '',
    url: ''
  });

  // State hooks to store input values from the form.
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // Accessing Redux state for user (to check if logged in)
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const error = useSelector((state) => state.auth.error);
  const dispatch = useDispatch();
  // Add this state to store form related errors
  const [formError, setFormError] = useState('');

  useEffect(() => {
    console.log("isAuthenticated:", isAuthenticated);
    if (isAuthenticated) {
      dispatch(fetchProfile())
        .then((res) => {
          if (res.payload && res.payload.data) {
            setProfile(res.payload.data);
          }
        })
        .catch((error) => {
          console.error("Failed to fetch profile:", error);
        });
    }
  }, [dispatch, isAuthenticated, error]);

  // If not logged in, redirect to sign-in page
  if (isAuthenticated === false) { 
    return <Navigate to='/signin' replace />;
  }

  // Handles form submission, invoking the update process.
  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prevProfile => ({
      ...prevProfile,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      console.log('Passwords do not match.');
      // Set an error state or alert the user
      setFormError('Passwords do not match.');
      return; // Prevent the form from being submitted
    }
    // Proceed with dispatching the updateProfile action if passwords match
    dispatch(updateProfile({ ...profile, password: newPassword })); // Make sure your updateProfile action can handle password updates
    setFormError(''); // Clear any existing errors
  };

  // Renders the user's profile information
  return (
    <div class="profile-edit-wrapper">
      <div class="display-box-wrapper">
        <div class="display-box">
          <form onSubmit={handleSubmit}>
            <h2 class='title'>Edit Profile</h2>
            <p className='mb-2'>
              <span className='mb-1 pr-4'>Username:</span>
              <span className='pb-1 text-xl'>{profile.username}</span>
            </p>
            <label class="form-label" htmlFor="password">New Password:</label>
            <input class="form-field" type="password" id="newPassword" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            <label class="form-label" htmlFor="password">Confirm Password:</label>
            <input class="form-field" type="password" id="confirmPassword" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
            {mutableFields.map(({ key, label }) => (
              <div key={key}>
              <label class="form-label" htmlFor={key}>{label}:</label>
                {key === 'bio' ? (
                  <textarea
                    class="form-textarea" // Adjust height as needed
                    id={key}
                    name={key}
                    value={profile[key]}
                    onChange={handleChange}
                  />
                ) : (
                  <input
                    class="form-field"
                    type="text"
                    id={key}
                    name={key}
                    value={profile[key]}
                    onChange={handleChange}
                  />
                )}
              </div>
            ))}
            <div class='button-box'>
              <button class='button cancel' type="button">Cancel</button>
              <button class='button submit' type="submit">Save Changes</button>
            </div>
            <div class='error-box'>
              {formError && <p class="error">{formError}</p>}
              {error && <p class="error">{error}</p>}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ProfileEdit;