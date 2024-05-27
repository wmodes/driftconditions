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
  const [playlistObj, setPlaylistObj] = useState({});
  const [seeMore, setSeeMore] = useState(false);
  const dispatch = useDispatch();
  const { user: userAuth } = useSelector((state) => state.auth);

  useEffect(() => {
    if (userAuth.permissions && userAuth.permissions.includes('recipeView')) {
      setSeeMore(true);
    }

    const loadPlaylist = async () => {
      try {
        const result = await dispatch(fetchQueuePlaylist()).unwrap();
        setPlaylistObj(result);
      } catch (error) {
        console.error('Failed to fetch playlist:', error);
      }
    };

    loadPlaylist();
    const intervalId = setInterval(loadPlaylist, 120000);

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, [dispatch, userAuth.permissions]);

  let recipeID = 0;
  let recipeTitle = 'Unspecified Recipe';
  let playlist = [];
  
  if (Array.isArray(playlistObj)) {
    playlist = playlistObj;
  } else {
    recipeID = playlistObj.recipeID;
    recipeTitle = playlistObj.recipeTitle;
    playlist = playlistObj.playlist || [];
  }

  return playlist.slice(1).map((mix) => (
    <div key={mix.mixID} className="playlist">
      <div className="time">{formatTime(mix.dateUsed)}</div>
      <div className="mix">
        {seeMore && (
          <Link to={`/recipe/view/${recipeID}`}><strong>{recipeTitle}</strong></Link>
        )}
        {mix.playlist.map((clip, index) => (
          <div key={index} className="clip">
            <span className="clip-title">{clip.title} </span>
            {clip.creatorUsername && (
              <span className="clip-creator">
                (Contrib: <Link to={`/profile/${clip.creatorUsername}`}>{clip.creatorUsername}</Link>)
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  ));
};

export default Playlist;
