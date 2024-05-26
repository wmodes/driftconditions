/**
 * @file This module provides a function to render a playlist of mixes with their respective clips,
 *       formatted according to the user's local time.
 */

import React from 'react';
import { Link } from 'react-router-dom';

// playlist is a complex object with nested objects
//   playlist = [
//     {
//       mixID: <int>,
//       dateUsed: <datetime>,
//       playlist: [
//         {title: <string>, creatorUsername: <string>},
//         {title: <string>, creatorUsername: <string>},
//       ]
//   ]
//
// We'll render this like this:
//   <div className="playlist">
//     <div className="time">
//       9:44 PM
//     </div>
//     <div className="mix">
//       <div className="clip">
//         <div className="title">Title</div>
//         <div className="creator">
//           <Link to={`/profile/${creatorUsername}`}>creatorUsername</Link>
//         </div>
//       </div>
//       <div className="clip">
//         <div className="title">Title</div>
//         <div className="creator">
//           <Link to={`/profile/${creatorUsername}`}>creatorUsername</Link>
//         </div>
//       </div>
//   </div>

/**
 * Render a playlist of mixes with their respective clips.
 *
 * @param {Array} playlist - A list of mix objects. Each mix object contains:
 *   - mixID: {number} - The ID of the mix.
 *   - dateUsed: {string} - The date and time when the mix was used (in UTC).
 *   - playlist: {Array} - A list of clip objects. Each clip object contains:
 *     - title: {string} - The title of the clip.
 *     - creatorUsername: {string} - The username of the clip's creator.
 * @returns {JSX.Element[]} A list of JSX elements representing the rendered playlist.
 */
export const renderPlaylist = (playlist) => {
  return playlist.slice(1).map((mix) => (
    <div key={mix.mixID} className="playlist">
      <div className="time">{formatTime(mix.dateUsed)}</div>
      <div className="mix">
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
