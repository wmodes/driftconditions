// AudioList.js - Edit audio details

// TODO: Modify URL to show audioID, sort, and filter


import React, { useEffect, useState, useRef } from 'react';
import { Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { audioList as audioListAction, audioTrash as audioTrashAction } from '../store/audioSlice';
import { parseQuery, stringifyQuery } from '../utils/queryUtils';
import FeatherIcon from 'feather-icons-react';
import { ReactComponent as AudioOn } from '../images/volume-animate.svg';

// Import the config object from the config.js file
const config = require('../config/config');
// pull variables from the config object
const recordsPerPage = config.audio.recordsPerPage;
const retryLimit = config.server.retryLimit;
const audioBaseURL = config.server.audioBaseURL;

function AudioList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, userRole } = useSelector((state) => state.auth); 

  // Add a loading state
  const [isLoading, setIsLoading] = useState(true);

  // Local state for managing audio list and pagination
  const [audioList, setAudioList] = useState([]);
  const [page, setPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [playingAudio, setPlayingAudio] = useState({ src: "", playing: false });

  // Add sort, order, and filter to state
  const [sort, setSort] = useState('');
  const [order, setOrder] = useState('DESC'); // Default to DESC
  const [filter, setFilter] = useState('');
  const [targetID, setTargetID] = useState(null);

  // Success and error handling
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [successMessage, setSuccessMessage] = useState(''); // State for success message
  const [error, setError] = useState(''); // State for general errors
  const [criticalError, setCriticalError] = useState('');

  // Parse current URL search params
  const currentFilters = parseQuery(location.search);

  // ref to audio player element
  const audioRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || retryAttempt >= retryLimit) return;
    setIsLoading(true); // Start loading
  
    // Directly extract params from URL each time the effect runs
    const searchParams = new URLSearchParams(location.search);
    const page = searchParams.get('page') || 1;
    const sort = searchParams.get('sort') || 'date';
    const order = searchParams.get('order') || 'DESC';
    const filter = searchParams.get('filter') || 'all';
  
    const queryParams = {
      page,
      sort,
      order,
      filter,
      recordsPerPage,
    };
  
    dispatch(audioListAction({ queryParams }))
      .unwrap()
      .then(response => {
        setAudioList(response.audioList);
        setTotalRecords(response.totalRecords);
        setIsLoading(false); // Stop loading once data is fetched
      })
      .catch(error => {
        console.error("Error fetching audio list:", error);
        setCriticalError('Failed to fetch audio list.');
        setAudioList([]);
        setIsLoading(false); // Stop loading on error
        setRetryAttempt(prevAttempt => prevAttempt + 1); // Increment retry attempt
      });
  // Only dependency is location.search to react to changes in search parameters
  }, [dispatch, location.search, isAuthenticated, retryAttempt, recordsPerPage]);

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

  const handlePageChange = (newPage) => {
    setPage(newPage);
    const newQueryParams = { ...currentFilters, page: newPage, recordsPerPage }; // Ensure recordsPerPage is included if needed
    navigate({ search: stringifyQuery(newQueryParams) }); // Update URL without reloading the page
    // Optionally, you might want to clear messages when changing pages
    setSuccessMessage('');
    setCriticalError('');
    setError('');
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

  // Placeholder for roles check function
  // const hasPermission = (action) => {
  //   return ['editor', 'mod', 'admin'].includes(userRole); // Simplified, adjust as needed
  // };

  if (isAuthenticated === false) {
    return <Navigate to='/signin' replace={true} />;
  }

  // Formating helpers

  function niceDate(dateString) {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).replace(',', ' at');
  }

  function niceList(input) {
    if (!input) return '';
    // Ensure input is treated as an array, useful if the input is an "array-like" object
    const arrayInput = Array.isArray(input) ? input : Object.values(input);
    return arrayInput.join(', ');
  }

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
            {criticalError && <p className="error">{criticalError}</p>}
            {error && <p className="error">{error}</p>}
          </div>
          {!criticalError && !isLoading ? (
            <>
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
                          &nbsp;on {niceDate(audio.upload_date)}
                        </div>
                        {audio.editor_username && (
                          <div className="authorline">
                            Edit:&nbsp;
                            <button className="link" 
                              onClick={() => handleFilter('user', audio.editor_username)}>
                              {audio.editor_username}
                            </button> 
                            &nbsp;on {niceDate(audio.edit_date)}
                          </div>
                        )}
                      </td>
                      <td className="duration">{parseFloat(audio.duration).toFixed(2)}s</td>
                      <td className="status">{audio.status}</td>
                      <td className="classification">{niceList(audio.classification)}</td>
                      <td className="tags">{niceList(audio.tags)}</td>
                      <td className="listen">
                        <button onClick={(e) => togglePlayAudio(audio.filename, e)}>
                          {/* <FeatherIcon className="icon default" icon="volume" /> */}
                          <AudioOn className="icon active" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="pagination">
                Page: 
                <ul>
                  {[...Array(Math.ceil(totalRecords / recordsPerPage)).keys()].map(n => (
                    <li>
                      <button key={n + 1} 
                        onClick={() => handlePageChange(n + 1)} 
                        disabled={page === n + 1}>
                        {n + 1}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <audio className="audioPlayer" ref={audioRef} controls onEnded={() => setPlayingAudio({ ...playingAudio, playing: false })}></audio>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default AudioList;