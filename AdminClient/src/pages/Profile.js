// Profile.js displays the logged-in user's profile information.

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { profileInfo } from '../store/userSlice';
import FeatherIcon from 'feather-icons-react';
import config from '../config/config';

const { topAudioCount, recentPendingCount } = config.profile;

function Profile() {
  // Accessing the username from the URL
  const { username } = useParams();
  // State hooks to store error message
  const [error, setError] = useState('');
  // State hooks to store user profile information
  const [profile, setProfile] = useState({});

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user: userAuth } = useSelector((state) => state.auth);
  const canSeeDetails = userAuth?.permissions?.includes('audioView');
  const canSeeNotes = userAuth?.permissions?.includes('userList');

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
          setError(res.payload || 'Failed to fetch profile.');
          setProfile(notFoundUser);
        }
      })
      .catch((error) => {
        console.error("Failed to fetch profile:", error);
        setError(error || 'Failed to fetch profile.');
        setProfile(notFoundUser);
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

  const stats = profile.stats || {};
  const audioStats = stats.audio || {};
  const recipeStats = stats.recipes || {};
  const generalStats = stats.general || {};

  // Renders the stats column
  function renderStats() {
    const topPlays = audioStats.topPlays || [];
    const recentPlayed = audioStats.recentPlayed || [];
    const recentPending = audioStats.recentPending || [];
    const hasRecipes = recipeStats.contributed > 0;
    const hasPending = recentPending.length > 0;
    const hasRecentPlayed = recentPlayed.length > 0;

    return (
      <div className="profile-stats">

        <h3>Audio</h3>
        <div className="stat-row">
          <span className="stat-label">Contributed</span>
          <span className="stat-value">{audioStats.contributed ?? 0}</span>
        </div>
        {audioStats.pending > 0 && (
          <div className="stat-row">
            <span className="stat-label">Waiting for approval</span>
            <span className="stat-value">{audioStats.pending}</span>
          </div>
        )}

        {hasRecipes && (
          <>
            <hr />
            <h3>Recipes</h3>
            <div className="stat-row">
              <span className="stat-label">Contributed</span>
              <span className="stat-value">{recipeStats.contributed}</span>
            </div>
            {recipeStats.pending !== undefined && (
              <div className="stat-row">
                <span className="stat-label">Waiting for approval</span>
                <span className="stat-value">{recipeStats.pending}</span>
              </div>
            )}
          </>
        )}

        <hr />
        <h3>Top Played Audio</h3>
        {topPlays.length > 0 ? (
          <ul className="stat-list">
            {topPlays.slice(0, topAudioCount).map((clip) => (
              <li key={clip.audioID}>
                <span className="clip-title" title={clip.title}>
                  {canSeeDetails
                    ? <Link to={`/audio/view/${clip.audioID}`}>{clip.title}</Link>
                    : clip.title
                  }
                </span>
                <span className="clip-count">{clip.timesUsed}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="stat-empty">No plays yet.</p>
        )}

        {hasRecentPlayed && (
          <>
            <hr />
            <h3>Recently Played Audio</h3>
            <ul className="stat-list">
              {recentPlayed.map((clip) => (
                <li key={clip.audioID}>
                  <span className="clip-title" title={clip.title}>
                    {canSeeDetails
                      ? <Link to={`/audio/view/${clip.audioID}`}>{clip.title}</Link>
                      : clip.title
                    }
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        {hasPending && (
          <>
            <hr />
            <h3>Waiting for Approval</h3>
            <ul className="stat-list">
              {recentPending.slice(0, recentPendingCount).map((clip) => (
                <li key={clip.audioID}>
                  <span className="clip-title" title={clip.title}>
                    {canSeeDetails
                      ? <Link to={`/audio/view/${clip.audioID}`}>{clip.title}</Link>
                      : clip.title
                    }
                  </span>
                  <span className="clip-count">{formatDate(clip.createDate)}</span>
                </li>
              ))}
            </ul>
          </>
        )}

      </div>
    );
  }

  // Renders the user's profile information
  return (
    <div className="profile-wrapper">
      <div className="display-box-wrapper">
        <div className="display-box">
          <div className="profile-columns">

            {/* Left column: profile card */}
            <div className="profile-card">
              <div className='flex items-center'>
                <div className='flex-shrink-0'>
                  <div className='avatar'>
                    {profile.avatar_url
                      ? <img src={profile.avatar_url} alt="avatar" referrerPolicy="no-referrer" />
                      : <FeatherIcon icon="user" />
                    }
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
                  <a href={`mailto:${profile.email}?subject=RE: driftconditions.org`} target="_blank" rel="noopener noreferrer">
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
              {generalStats.lastContributed && (
                <div className="my-0 text-center">
                  Last contributed {formatDate(generalStats.lastContributed)}
                </div>
              )}
              {audioStats.totalPlays > 0 && (
                <>
                  <div className="my-0 text-center">
                    {audioStats.totalPlays} total plays
                  </div>
                  <hr className="my-2" />
                </>
              )}
              {(profile.roleNameShow || profile.roleName) && (
                <div className="my-0 text-center">
                  Current role: <span className="italic capitalize">{profile.roleNameShow || profile.roleName}</span>
                </div>
              )}
              {(profile.statusShow || profile.status) && (
                <div className="mt-0 mb-5 text-center">
                  Status: <span className="italic capitalize">{profile.statusShow || profile.status}</span>
                </div>
              )}
              {canSeeNotes && profile.notes && (
                <div className="admin-notes">
                  <strong>Notes:</strong>
                  <p>{profile.notes}</p>
                </div>
              )}
              {profile.edit && (
                <div className="edit-box">
                  <Link to={`/profile/edit/${profile.username}`} className="edit-button">
                    Edit
                  </Link>
                </div>
              )}
              <div className='message-box'>
                {error && <p className="error">{error}</p>}
              </div>
            </div>

            {/* Vertical rule */}
            <div className="profile-divider" />

            {/* Right column: stats */}
            {renderStats()}

          </div>
        </div>
      </div>
    </div>
  );

}

export default Profile;
