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
  const dispatch = useDispatch();
  const { user: userAuth } = useSelector((state) => state.auth);

  useEffect(() => {
    if (userAuth.permissions && userAuth.permissions.includes('recipeView')) {
      setSeeMore(true);
    }

    const loadFullPlaylist = async () => {
      try {
        const result = await dispatch(fetchQueuePlaylist()).unwrap();
        setFullPlaylist(result);
      } catch (error) {
        console.error('Failed to fetch playlist:', error);
      }
    };

    loadFullPlaylist();
    const intervalId = setInterval(loadFullPlaylist, 120000);

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, [dispatch, userAuth.permissions]);

  const renderMix = (mix) => {
    const recipeID = mix.recipeID
    const recipeTitle = mix.title;
    let mixPlaylist = mix.playlist || [];

    // if mixPlaylist is not an array, get the real playlist from playlist.playlist
    if (!Array.isArray(mixPlaylist)) {
      mixPlaylist = mixPlaylist.playlist;
    }

    console.log(`Playlist:renderMix: mix: ${JSON.stringify(mix, null, 2)}, typeof mix: ${typeof mix}`);
    console.log(`Playlist:renderMix: mixPlaylist: ${JSON.stringify(mixPlaylist, null, 2)}`);

    return (
      <div key={mix.mixID} className="mix">
        {seeMore && (
          <Link to={`/recipe/view/${recipeID}`}><strong>{recipeTitle}</strong></Link>
        )}
        {mixPlaylist.map((clip, index) => (
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
    );
  };

  return fullPlaylist.slice(1).map((mix) => (
    <div key={mix.mixID} className="playlist">
      <div className="time">{formatTime(mix.dateUsed)}</div>
      {renderMix(mix)}
    </div>
  ));
};

export default Playlist;
