// Profile.js displays the logged-in user's profile information.

import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { profileInfo } from '../store/userSlice';
import FeatherIcon from 'feather-icons-react';

function Profile() {
  // Accessing the username from the URL
  const { username } = useParams();
  // State hooks to store error message
  const [error, setError] = useState('');
  // State hooks to store user profile information
  const [profile, setProfile] = useState({});

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const notFoundUser = {
    username: '$&**$%@!',
    firstname: 'User',
    lastname: 'Not Found',
    email: 'notfound@modes.io',
    url: 'https://unavoidabledisaster.com',
    location: "Nowhere",
    bio: "An enigmatic figure vanishing in digital shadows, leaving a trail of 404 errors, and enjoying unresolvable DNS queries. A true internet mystery.", 
    roleName: 'A mystery wrapped in an enigma',
    addedOn: 'January 1, 1970',
  }

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
            navigate(`/profile/${newProfile.username}`, { replace: true });
          }
          setError('');
        } else if (res.error) {
          // Handle the case where the user is not found
          setError('User not found');
          setProfile(notFoundUser); // Set the profile information to a notFoundUser
        }
      })
      .catch((error) => {
        console.error("Failed to fetch profile:", error);
        setError(error.toString());
        setProfile(notFoundUser); // Fallback to notFoundUser in case of any error
      });
  }, [dispatch, username, navigate]);

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
              <div className='avatar'>
                <FeatherIcon icon="user" />
              </div>
            </div>
            <div className='flex-grow ml-4 text-center'>
              <h2 className='title'>
                {profile.firstname} {profile.lastname}
              </h2>
              <h3 className='subtitle'>
                {profile.username}
              </h3>
            </div>
          </div>
          {profile.bio && (
            <p className='my-2'>
              {profile.bio}
            </p>
          )}
          {profile.location && (
            <p className='my-2 text-lg'>
              <FeatherIcon icon="map-pin" />&nbsp;{profile.location}
            </p>
          )}
          {profile.email && (
            <p className='my-2 text-lg'>
              <FeatherIcon icon="mail" />&nbsp;
              <a href="mailto:{profile.email}" target="_blank" rel="noopener noreferrer">
                {profile.email}
              </a>
            </p>
          )}
          {profile.url && (
            <p className='my-2 text-lg'>
              <FeatherIcon icon="link-2" />&nbsp;
              <a href={profile.url} target="_blank" rel="noopener noreferrer">
                {trimProtocol(profile.url)}
              </a>
            </p>
          )}
          {profile.addedOn && (
            <div className="mt-5 text-center">
              Member since {formatDate(profile.addedOn)}
            </div>
          )}
          {profile.roleName && (
            <div className="my-0 text-center">
              Current role: <span className="italic capitalize">{profile.roleName}</span>
            </div>
          )}
          {profile.status && (
            <div className="mt-0 mb-5 text-center">
              Status: <span className="italic capitalize">{profile.status}</span>
            </div>
          )}
          {profile.edit && (
            <div className="edit-box">
              <Link to="/profile/edit" className="edit-button">
                Edit
              </Link>
            </div>
          )}
          <div className='message-box'>
            {error && <p className="error">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
  
}

export default Profile;
