// ProfileEdit.js allows user to edit profile information.

import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { profileInfo, profileEdit } from '../store/userSlice';
import FeatherIcon from 'feather-icons-react';
import { Waiting } from '../utils/appUtils';

function ProfileEdit() { 
  // Use useParams to access the route parameters
  const { username } = useParams();

  // State hooks to store user profile information
  const [profile, setProfile] = useState({});
  // State hooks to store input values from the form.
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Success and error handling
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    dispatch(profileInfo({username})) // Dispatching with potentially undefined username
      .then((res) => {
        if (res.payload && res.payload.data) {
          const newProfile = res.payload.data;
          setProfile(newProfile);
          // This is the case where we didn't provide a username 
          // and it returns the logged in user's info
          if (!username) {
            // Modify URL to include the user's username
            navigate(`/profile/edit/${newProfile.username}`, { replace: true });
          }
          setError('');
        } else if (res.error) {
          // Handle the case where the user is not found
          setError('User not found');
        }
      })
      .catch((error) => {
        console.error("Failed to fetch profile:", error);
        setError(error.toString());
      })
      .finally(() => {
        setIsLoading(false); // Set loading to false after fetching
      });
  }, [dispatch, username, navigate]);

  console.debug(`ProfileEdit: Profile fetched: ${JSON.stringify(profile, null, 2)}`);

  // Keep values in sync with form values
  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prevState => ({ ...prevState, [name]: value }));
  };

  const handleSubmit = (e) => {
    setIsLoading(true);
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      // console.log('Passwords do not match.');
      // Set an error state or alert the user
      setError('Passwords do not match.');
      setIsLoading(false);
      return; // Prevent the form from being submitted
    }
    // Proceed with dispatching the profileEdit action if passwords match
    const updatedProfile = { ...profile };
    if (newPassword) {
      updatedProfile.password = newPassword;
    }
    dispatch(profileEdit({profile: updatedProfile}))
      .then(() => {
        setSuccessMessage('Profile updated successfully!'); 
        setError(''); // Clear any existing errors
      })
      .catch(error => {
        console.error("Failed to update profile:", error);
        setError('An error occurred while updating the profile.');
      })
      .finally(() => {
        setIsLoading(false); // Set loading to false after fetching
      });
  };

  // Check if required fields are filled
  const requiredFields = ['firstname', 'lastname', 'email'];
  const isFormValid = requiredFields.every(field => profile[field]);
  const Required = () => <span className="required">*</span>;
  
  //
  // RENDERING HELPERS
  //

  // Function to format the date as "Month Year"
  function formatDate(dateString) {
    if (!dateString) return dateString;
    const date = new Date(dateString);
    const options = { month: 'long', year: 'numeric' };
    return new Intl.DateTimeFormat('en-US', options).format(date);
  }

  if (isLoading) {
    return (<Waiting />);
  }

  // console.log(`ProfileEdit: Profile to render: ${JSON.stringify(profile, null, 2)}`);

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

            {profile.firstname !== undefined && (
              <div>
                <label className="form-label" htmlFor="firstname">First Name: <Required /></label>
                <input className="form-field" type="text" id="firstname" name="firstname" value={profile.firstname} onChange={handleChange} />
              </div>
            )}
            {profile.lastname !== undefined && (
              <div>
                <label className="form-label" htmlFor="lastname">Last Name: <Required /></label>
                <input className="form-field" type="text" id="lastname" name="lastname" value={profile.lastname} onChange={handleChange} />
              </div>
            )}
            {profile.email !== undefined && (
              <div>
                <label className="form-label" htmlFor="email">Email: <Required /></label>
                <div className="flex gap-2">
                  <input className="form-field" type="text" id="email" name="email" value={profile.email} onChange={handleChange} />{' '}
                  <a href={`mailto:${profile.email}?subject=RE: driftconditions.org`} target="_blank" rel="noopener noreferrer" className="pt-1">
                    <FeatherIcon icon="mail" color="#336699" />
                  </a>
                </div>
              </div>
            )}
            {profile.url !== undefined && (
              <div>
                <label className="form-label" htmlFor="url">URL:</label>
                <div className="flex gap-2">
                <input className="form-field" type="text" id="url" name="url" value={profile.url} onChange={handleChange} />{' '}
                <a href={profile.url} target="_blank" rel="noopener noreferrer" className="pt-1">
                    <FeatherIcon icon="link" color="#336699" />
                  </a>
                </div>
              </div>
            )}
            {profile.bio !== undefined && (
              <div>
                <label className="form-label" htmlFor="bio">Biography:</label>
                <textarea className="form-textarea" id="bio" name="bio" value={profile.bio} onChange={handleChange} />
              </div>
            )}
            {profile.location !== undefined && (
              <div>
                <label className="form-label" htmlFor="location">Location:</label>
                <input className="form-field" type="text" id="location" name="location" value={profile.location} onChange={handleChange} />
              </div>
            )}
            {profile.roleName !== undefined && (
              <div>
                <label className="form-label" htmlFor="roleName">Role: <Required /></label>
                <select className="form-field" id="roleName" name="roleName" value={profile.roleName} onChange={handleChange}>
                  <option value="user">User</option>
                  <option value="contributor">Contributor</option>
                  <option value="editor">Editor</option>
                  <option value="mod">Mod</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            )}
            {profile.status !== undefined && (
              <div>
                <label className="form-label" htmlFor="status">Status: {requiredFields.includes('status') && <Required />}</label>
                <select className="form-field" id="status" name="status" value={profile.status} onChange={handleChange}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            )}

            {profile.addedOn && (
              <div className="mt-2 text-center">
                Member since {formatDate(profile.addedOn)}
              </div>
            )}
            {profile.roleNameShow && !profile.roleName && (
              <div className="my-0 text-center">
                Current role: <span className="italic capitalize">{profile.roleNameShow}</span>
              </div>
            )}
            {profile.statusShow && !profile.status && (
              <div className="my-0 text-center">
                Status: <span className="italic capitalize">{profile.statusShow}</span>
              </div>
            )}

            <div className="mt-7">
              <label className="form-label" htmlFor="password">New Password:</label>
              <input className="form-field" type="password" id="newPassword" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              <label className="form-label" htmlFor="password">Confirm Password:</label>
              <input className="form-field" type="password" id="confirmPassword" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
            </div>

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