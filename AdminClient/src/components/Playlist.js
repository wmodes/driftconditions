/**
 * @file This module provides a component to render a playlist of mixes with their respective clips,
 *       formatted according to the user's local time, and refreshing it at regular intervals.
 */

import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchQueuePlaylist } from '../store/queueSlice';

/**
 * Helper function to format date and time in the user's local time zone.
 *
 * @param {string} datetime - The date and time string in UTC.
 * @returns {string} The formatted time string in the user's local time zone.
 */
const formatTime = (datetime) => {
  const date = new Date(datetime);
  // Replace standard space with a non-breaking space character
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).replace(' ', '\u00A0');
};

/**
 * Render a playlist of mixes with their respective clips.
 *
 * @returns {JSX.Element[]} A list of JSX elements representing the rendered playlist.
 */
const Playlist = () => {
  const [fullPlaylist, setFullPlaylist] = useState([]);
  const [seeMore, setSeeMore] = useState(false);
  const [error, setError] = useState(false);
  const dispatch = useDispatch();
  const { user: userAuth } = useSelector((state) => state.auth);

  useEffect(() => {
    // console.log(`Playlist component: userAuth.permissions: ${userAuth.permissions}`)
    if (userAuth && userAuth.permissions && userAuth.permissions.includes('recipeView')) {
      setSeeMore(true);
    } 

    const loadFullPlaylist = async () => {
      try {
        const result = await dispatch(fetchQueuePlaylist()).unwrap();
        setFullPlaylist(result);
        setError(false); // Clear error if data is successfully fetched
      } catch (error) {
        console.error('Failed to fetch playlist:', error);
        setError(true);
      }
    };

    loadFullPlaylist();
    const intervalId = setInterval(loadFullPlaylist, 120000);

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, [dispatch, userAuth]);

  const renderMix = (mix) => {
    const recipeID = mix.recipeID;
    const recipeTitle = mix.title;
    let mixPlaylist = mix.playlist || [];

    // if mixPlaylist is not an array, get the real playlist from mixPlaylist.playlist
    if (!Array.isArray(mixPlaylist)) {
      mixPlaylist = mixPlaylist.playlist || [];
    }

    return (
      <div key={mix.mixID} className="mix">
        {seeMore && (
          <Link to={`/recipe/view/${recipeID}`}><strong>{recipeTitle}</strong></Link>
        )}
        {mixPlaylist.map((clip, index) => (
          <div key={index} className="clip">
            {seeMore ? (
              <span className="clip-title">
                <Link to={`/audio/view/${clip.audioID}`}>{clip.title}</Link>
              </span>
            ) : (
              <span className="clip-title">{clip.title}</span>
            )}
            {clip.creatorUsername && (
              <span className="clip-creator">
                &nbsp;(Contrib: <Link to={`/profile/${clip.creatorUsername}`}>{clip.creatorUsername}</Link>)
              </span>
            )}
          </div>
        ))}
      </div>
    );
  };
  
  if (error || fullPlaylist.length === 0) {
    return (
      <div className="unavailable-wrapper">
        <div className="unavailable-box">
          No playlist available at the moment.
        </div>
      </div>
    );
  }  

  return (
    <div className="playlist text-center">
      {fullPlaylist.slice(1).map((mix) => (
        <div key={mix.mixID} className="playlist-item">
          <div className="time">{formatTime(mix.dateUsed)}</div>
          {renderMix(mix)}
        </div>
      ))}
    </div>
  );
  
};

export default Playlist;
