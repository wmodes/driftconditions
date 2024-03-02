// Profile.js displays the logged-in user's profile information.

import React, { useEffect, useState } from 'react';
// Hooks for Redux state management and action dispatching, if needed.
import { useDispatch, useSelector } from 'react-redux';
// Assuming you have an action or function to fetch user profile
import { profileInfo } from '../store/userSlice';
// For redirecting the user in case they are not logged in
import { Link, Navigate } from 'react-router-dom';
// feather icons
import FeatherIcon from 'feather-icons-react';

function Profile() {
  // State hooks to store user profile information
  const [profile, setProfile] = useState({
    username: '',
    firstname: '',
    lastname: '',
    email: '',
    role_name: '',
    added_on: '',
  });

  // Accessing Redux state for user (to check if logged in)
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const error = useSelector((state) => state.auth.error);

  const dispatch = useDispatch();

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(profileInfo())
        .then((res) => {
          // Dynamically update profile state with res.payload.data properties
          if (res.payload && res.payload.data) {
            let newProfile = {};
            for (const [key, value] of Object.entries(res.payload.data)) {
              newProfile[key] = value;
            }
            setProfile(newProfile);
          }
        })
        .catch((error) => {
          console.error("Failed to fetch profile:", error);
        });
    }
  }, [dispatch, isAuthenticated, error]);

  // If not logged in, redirect to sign-in page
  if (isAuthenticated === false) {
    return <Navigate to='/signin' replace={true} />;
  }

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

  // Function to trim protocol from URL
  function trimProtocol(url) {
    if (!url) return url;
    return url.replace(/(^\w+:|^)\/\//, '');
  }

  // Renders the user's profile information
  return (
    <div className="profile-wrapper">
      <div className="display-box-wrapper">
        <div className="display-box">
          <div className='flex items-center'>
            <div className='flex-shrink-0'>
              <FeatherIcon icon="circle" color="#9fbfdf" fill="#9fbfdf" size="100" />
            </div>
            <div className='flex-grow ml-4 text-center'>
              <h2 className='title'>{profile.firstname} {profile.lastname}</h2>
              <h3 className='subtitle'>{profile.username}</h3>
            </div>
          </div>
          {profile.bio && <p className='my-2'>{profile.bio}</p>}
          {profile.location && <p className='my-2 text-lg'><FeatherIcon icon="map-pin" />&nbsp;{profile.location}</p>}
          <p className='my-2 text-lg'>
            <FeatherIcon icon="mail" />&nbsp;
            <a href="mailto:{profile.email}" target="_blank" rel="noopener noreferrer">
              {profile.email}
            </a>
          </p>
          {profile.url && (
            <p className='my-2 text-lg'>
              <FeatherIcon icon="link-2" />&nbsp;
              <a href={profile.url} target="_blank" rel="noopener noreferrer">
                {trimProtocol(profile.url)}
              </a>
            </p>
          )}
          <p className="my-5 text-center">Member since {formatDate(profile.added_on)}<br></br>
          Current role: <span className="italic capitalize">{profile.role_name}</span>
          </p>
          {profile.edit && (
            <div className="flex justify-end">
              <Link to="/profile/edit" className="mt-5 mb-0 py-0 text-sm">
                Edit
              </Link>
            </div>
          )}
        </div>
        <div className='message-box'>
          {error && <p className="error">{error}</p>}
        </div>
      </div>
    </div>
  );
  
}

export default Profile;
