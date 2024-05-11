// ProfileEdit.js allows user to edit profile information.

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
// Assuming you have an action or function to fetch user profile
import { profileInfo, profileEdit } from '../store/userSlice';

function ProfileEdit() { 
  // Use useParams to access the route parameters
  const { username } = useParams();

  // Possibel 
  // TODO: Killme
  const mutableFields = [
    { key: 'firstname', label: 'First Name' },
    { key: 'lastname', label: 'Last Name' },
    { key: 'email', label: 'Email' },
    { key: 'bio', label: 'Biography' },
    { key: 'location', label: 'Location' },
    { key: 'url', label: 'Your Website URL' }
  ];

  const [profile, setProfile] = useState({});

  // State hooks to store input values from the form.
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const dispatch = useDispatch();

  // Success and error handling
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    dispatch(profileInfo({ username }))
      .then((res) => {
        // console.log('Profile fetched:', res.payload);
        if (res.payload && res.payload.data) {
          setProfile(res.payload.data);
        }
      })
      .catch((error) => {
        console.error("Failed to fetch profile:", error);
        setError('Failed to fetch profile.');
      });
  }, [username, dispatch]);

  console.debug(`ProfileEdit: Profile fetched: ${JSON.stringify(profile, null, 2)}`);

  // Keep values in sync with form values
  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prevState => ({ ...prevState, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      console.log('Passwords do not match.');
      // Set an error state or alert the user
      setError('Passwords do not match.');
      return; // Prevent the form from being submitted
    }
    // Proceed with dispatching the profileEdit action if passwords match
    dispatch(profileEdit({ ...profile, password: newPassword }))
      .then(() => {
        setSuccessMessage('Profile updated successfully!'); 
        setError(''); // Clear any existing errors
      })
      .catch(error => {
        console.error("Failed to update profile:", error);
        setError('An error occurred while updating the profile.');
      });
  };

  // Check if required fields are filled
  const requiredFields = ['firstname', 'lastname', 'email'];
  const isFormValid = requiredFields.every(field => profile[field]);
  const Required = () => <span className="required">*</span>;

  // Renders the user's profile information
  return (
    <div className="profile-wrapper">
      <div className="display-box-wrapper">
        <div className="display-box">
          <form onSubmit={handleSubmit}>
            <h2 className='title'>Edit Profile</h2>
            <p className='mb-2'>
              <span className='form-label mb-1 pr-4'>Username:</span>
              <span className='pb-1 text-xl'>{profile.username}</span>
            </p>
            {profile.map(({ key, label }) => (
              <div key={key}>
                <label className="form-label" htmlFor={key}>
                  {label}: {requiredFields.includes(key) && <Required />}
                </label>
                {key === 'bio' ? (
                  <textarea
                    className="form-textarea"
                    id={key}
                    name={key}
                    value={profile[key]}
                    onChange={handleChange}
                  />
                ) : (
                  <input
                    className="form-field"
                    type="text"
                    id={key}
                    name={key}
                    value={profile[key]}
                    onChange={handleChange}
                  />
                )}
              </div>
            ))}
            <label className="form-label" htmlFor="password">New Password:</label>
            <input className="form-field" type="password" id="newPassword" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            <label className="form-label" htmlFor="password">Confirm Password:</label>
            <input className="form-field" type="password" id="confirmPassword" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
            <div className='button-box'>
              <button className='button cancel' type="button">Cancel</button>
              <button className='button submit' type="submit" disabled={!isFormValid}>Save Changes</button>
            </div>
            <div className='message-box'>
              {successMessage && <p className="success">{successMessage}</p>}
              {error && <p className="error">{error}</p>}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ProfileEdit;