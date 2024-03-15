// AudioList.js - Edit audio details

// TODO: Add search field

import React, { useEffect, useState, useRef } from 'react';
import { Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { audioList as audioListAction, audioTrash as audioTrashAction } from '../store/audioSlice';
import { useCheckAuth } from '../utils/authUtils';
import { parseQuery, stringifyQuery } from '../utils/queryUtils';
import { renderPagination } from '../utils/listUtils'; 
import { formatDateForDisplay, formatListForDisplay } from '../utils/formatUtils';
import { ReactComponent as AudioOn } from '../images/volume-animate.svg';

// Import the config object from the config.js file
const config = require('../config/config');
// pull variables from the config object
const recordsPerPage = config.audio.recordsPerPage;
const retryLimit = config.server.retryLimit;
const audioBaseURL = config.server.audioBaseURL;

function AudioList() {
  useCheckAuth('audioList');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  // Local state for managing audio list and pagination
  const [audioList, setAudioList] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setpage] = useState(1);
  const [playingAudio, setPlayingAudio] = useState({ src: "", playing: false });

  // Success and error handling
  const [isLoading, setIsLoading] = useState(true);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [successMessage, setSuccessMessage] = useState(''); // State for success message
  const [error, setError] = useState('');

  // Parse current URL search params
  const currentFilters = parseQuery(location.search);

  // ref to audio player element
  const audioRef = useRef(null);

  useEffect(() => {
    if (retryAttempt >= retryLimit) return;
    setIsLoading(true); // Start loading
  
    // Directly extract params from URL each time the effect runs
    const searchParams = new URLSearchParams(location.search);
    const page = parseInt(searchParams.get('page') || 1, 10);
    setpage(page);
    const sort = searchParams.get('sort') || 'date';
    const order = searchParams.get('order') || 'DESC';
    const filter = searchParams.get('filter') || 'all';
  
    const queryParams = {
      page: page,
      sort,
      order,
      filter,
    };
  
    dispatch(audioListAction(queryParams))
      .unwrap()
      .then(response => {
        setAudioList(response.audioList);
        setTotalRecords(response.totalRecords);
        setIsLoading(false); // Stop loading once data is fetched
      })
      .catch(error => {
        console.error("Error fetching audio list:", error);
        setError('Failed to fetch audio list.');
        setAudioList([]);
        setIsLoading(false); // Stop loading on error
        setRetryAttempt(prevAttempt => prevAttempt + 1); // Increment retry attempt
      });
  // Only dependency is location.search to react to changes in search parameters
  }, [dispatch, location.search, retryAttempt]);

  // Placeholder for roles check function
  // const hasPermission = (action) => {
  //   return ['editor', 'mod', 'admin'].includes(userRole); // Simplified, adjust as needed
  // };

  const audioTrash = (audioID) => {
    dispatch(audioTrashAction({ audioID }))
      .unwrap()
      .then(() => {
        setSuccessMessage(`Audio ${audioID} trashed successfully.`);
        // Optionally, refresh the audio list or remove the trashed item from the state
      })
      .catch(error => {
        console.error("Error trashing audio:", error);
        setError('Failed to trash audio.'); // Update error state
      });
  };

  const handleSort = (newSort, newOrder = 'DESC') => {
    const searchParams = new URLSearchParams(location.search);
    newSort && searchParams.set('sort', newSort);
    newOrder && searchParams.set('order', newOrder);
    navigate(`${location.pathname}?${searchParams.toString()}`);
  };
  
  const handleFilter = (newFilter, targetID = null) => {
    const searchParams = new URLSearchParams(location.search);
  
    if (newFilter === 'all') {
      searchParams.delete('filter');
    } else {
      searchParams.set('filter', newFilter);
      if (newFilter === 'user' && targetID) {
        searchParams.set('targetID', targetID);
      } else {
        searchParams.delete('targetID');
      }
    }
    navigate(`${location.pathname}?${searchParams.toString()}`);
  };

  const handlePageChange = (newPage) => {
    setpage(newPage);
    const newQueryParams = { ...currentFilters, page: newPage };
    navigate({ search: stringifyQuery(newQueryParams) }); // Update URL without reloading the page
    setSuccessMessage('');
    setError('');
    setError('');
  };

  //
  // audio preview
  //

  const togglePlayAudio = (filename, event) => {
    const newSrc = `${audioBaseURL}/${filename}`;
    // First, remove 'active' class from all buttons
    document.querySelectorAll('.listen button').forEach(btn => {
      btn.classList.remove('active');
    });
  
    if (playingAudio.src === newSrc && playingAudio.playing) {
      // If this audio is currently playing, stop it
      audioRef.current.pause();
      setPlayingAudio({ src: "", playing: false });
      // No need to add 'active' class since audio is stopped
    } else {
      // Change the source only if different
      if (audioRef.current.src !== newSrc) {
        audioRef.current.src = newSrc;
      }
      // Play new audio
      audioRef.current.play();
      setPlayingAudio({ src: newSrc, playing: true });
      // Add 'active' class to the button that fired the event
      event.currentTarget.classList.add('active');
    }
  };  
  

  return (
    <div className="list-wrapper">
      <div className="display-box-wrapper">
        <div className="display-box">
          <h2 className='title'>Audio List</h2>
          <div className='message-box'>
            {isLoading && <p className="success">Loading...</p>}
            {successMessage && <p className="success">{successMessage}</p>}
            {error && <p className="error">{error}</p>}
          </div>
          {!error && !isLoading ? (
            <div>
              <div className="top-controls">
                <div className="filter-box">
                  <ul>
                    <li>
                      <button className="link" onClick={() => handleFilter('all')}>
                        All
                      </button>
                    </li>
                    <li>
                      <button className="link" onClick={() => handleFilter('review')}>
                        Review
                      </button>
                    </li>
                    <li>
                      <button className="link" onClick={() => handleFilter('approved')}>
                        Approved
                      </button>
                    </li>
                    <li>
                      <button className="link" onClick={() => handleFilter('disapproved')}>
                        Disapproved
                      </button>
                    </li>
                    <li>
                      <button className="link" onClick={() => handleFilter('trash')}>
                        Trash
                      </button>
                    </li>
                  </ul>
                </div>
                {renderPagination(totalRecords, recordsPerPage, page, handlePageChange)}
              </div>
              <table className="audio-table big-table">
                <thead>
                  <tr>
                    <th className="id">
                      <button className="link" onClick={() => handleSort('id', 'ASC')}>
                        ID
                      </button>
                    </th>
                    <th className="title">
                      <button className="link" onClick={() => handleSort('title', 'ASC')}>
                        Title
                      </button>
                    </th>
                    <th className="author">
                      <button className="link" onClick={() => handleSort('author', 'ASC')}>
                        Author
                      </button> / 
                      <button className="link" onClick={() => handleSort('date', 'ASC')}>
                         Date
                      </button>
                    </th>
                    <th className="duration">Duration</th>
                    <th className="status">
                      <button className="link" onClick={() => handleSort('status', 'DESC')}>
                        Status
                      </button>
                    </th>
                    <th className="classification">Classification</th>
                    <th className="tags">Tags</th>
                    <th className="listen">Listen</th>
                  </tr>
                </thead>
                <tbody>
                  {audioList.map(audio => (
                    <tr key={audio.audio_id}>
                      <td className="id">{audio.audio_id}</td>
                      <td className="title">
                        <div>{audio.title}</div>
                        <div>
                          <ul className="action-list">
                            <li><Link to={`/audio/view/${audio.audio_id}`}>View</Link></li>
                            <li><Link to={`/audio/edit/${audio.audio_id}`}>Edit</Link></li>
                            <li><button className="link" onClick={() => audioTrash(audio.audio_id)}>Trash</button></li>
                          </ul>
                        </div>
                      </td>
                      <td className="author">
                        <div className="authorline">
                          Upload:&nbsp;
                          <button className="link" 
                            onClick={() => handleFilter('user', audio.uploader_username)}>
                            {audio.uploader_username}
                          </button> 
                          &nbsp;on {formatDateForDisplay(audio.upload_date)}
                        </div>
                        {audio.editor_username && (
                          <div className="authorline">
                            Edit:&nbsp;
                            <button className="link" 
                              onClick={() => handleFilter('user', audio.editor_username)}>
                              {audio.editor_username}
                            </button> 
                            &nbsp;on {formatDateForDisplay(audio.edit_date)}
                          </div>
                        )}
                      </td>
                      <td className="duration">{parseFloat(audio.duration).toFixed(2)}s</td>
                      <td className="status">{audio.status}</td>
                      <td className="classification">{formatListForDisplay(audio.classification)}</td>
                      <td className="tags">{formatListForDisplay(audio.tags)}</td>
                      <td className="listen">
                        <button className="icon" onClick={(e) => togglePlayAudio(audio.filename, e)}>
                          {/* <FeatherIcon className="icon default" icon="volume" /> */}
                          <AudioOn className="icon active" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="bottom-controls">
                {renderPagination(totalRecords, recordsPerPage, page, handlePageChange)}
              </div>
              <audio className="audioPlayer" ref={audioRef} controls onEnded={() => setPlayingAudio({ ...playingAudio, playing: false })}></audio>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default AudioList;