// AudioList.js - Edit audio details

import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { 
  audioList as audioListAction, 
  audioTrash as audioTrashAction,
  audioUpdate
} from '../store/audioSlice';
import { parseQuery, stringifyQuery } from '../utils/queryUtils';
import { renderPagination } from '../utils/listUtils'; 
import { formatDateAsFriendlyDate, formatListAsString, formatDuration } from '../utils/formatUtils';
import { ReactComponent as AudioOn } from '../images/volume-animate.svg';

import config from '../config/config';
const recordsPerPage = config.list.recordsPerPage;
const retryLimit = config.adminServer.retryLimit;
const audioBaseURL = config.adminServer.audioBaseURL;

function AudioList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const [audioList, setAudioList] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);
  const [playingAudio, setPlayingAudio] = useState({ src: "", playing: false });
  const [isLoading, setIsLoading] = useState(true);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [editAudioID, setEditAudioID] = useState(null);
  const [editedRecord, setEditedRecord] = useState({
    audioID: null,
    title: '',
    status: '',
    classification: '',
    tags: '',
    comments: ''
  });
  const [updateTrigger, setUpdateTrigger] = useState(false);

  const currentFilters = parseQuery(location.search);
  const audioRef = useRef(null);

  // Search input state — initialized from URL and kept in sync with URL changes
  const [searchInput, setSearchInput] = useState(() => new URLSearchParams(location.search).get('search') || '');
  useEffect(() => {
    setSearchInput(new URLSearchParams(location.search).get('search') || '');
  }, [location.search]);

  const getCurrentQueryParams = () => {
    const searchParams = new URLSearchParams(location.search);
    return {
      page: parseInt(searchParams.get('page') || '1', 10),
      sort: searchParams.get('sort') || 'date',
      order: searchParams.get('order') || 'DESC',
      filter: searchParams.get('filter') || 'all',
      targetID: searchParams.get('targetID') || null,
      search: searchParams.get('search') || '',
    };
  };

  useEffect(() => {
    if (retryAttempt >= retryLimit) return;
    setIsLoading(true); // Start loading
    
    const queryParams = getCurrentQueryParams();
  
    dispatch(audioListAction({ queryParams }))
      .unwrap()
      .then(response => {
        setAudioList(response.audioList || []);
        setTotalRecords(response.totalRecords);
        setIsLoading(false); // Stop loading once data is fetched
      })
      .catch(error => {
        console.error("Error fetching audio list:", error);
        setError(error || 'Failed to fetch audio list.');
        setAudioList([]);
        setIsLoading(false); // Stop loading on error
        setRetryAttempt(prevAttempt => prevAttempt + 1); // Increment retry attempt
      });
  // Add updateTrigger as a dependency
  }, [dispatch, location.search, retryAttempt, updateTrigger]);  

  const audioTrash = async (audioID) => {
    dispatch(audioTrashAction({ audioID }))
      .unwrap()
      .then(() => {
        setSuccessMessage(`Audio ${audioID} trashed successfully.`);
        const queryParams = getCurrentQueryParams();
        dispatch(audioListAction({ queryParams }))
        .unwrap()
        .then(response => {
          setAudioList(response.audioList || []);
          setTotalRecords(response.totalRecords);
        })
        .catch(error => {
          console.error("Error fetching updated audio list:", error);
          setError(error || 'Failed to fetch updated audio list.');
        });
      })
      .catch(error => {
        console.error("Error trashing audio:", error);
        setError(error || 'Failed to trash audio.');
      });
  };

  const handleSort = (newSort, newOrder = 'DESC') => {
    const searchParams = new URLSearchParams(location.search);
    newSort && searchParams.set('sort', newSort);
    newOrder && searchParams.set('order', newOrder);
    navigate(`${location.pathname}?${searchParams.toString()}`);
  };
  
  const handleFilter = (newFilter) => {
    const searchParams = new URLSearchParams(location.search);
    if (newFilter === 'all') {
      searchParams.delete('filter');
    } else {
      searchParams.set('filter', newFilter);
    }
    searchParams.delete('page');
    navigate(`${location.pathname}?${searchParams.toString()}`);
  };

  const handleUserFilter = (creatorID, creatorUsername) => {
    const searchParams = new URLSearchParams(location.search);
    searchParams.set('targetID', creatorID);
    searchParams.set('targetUsername', creatorUsername);
    searchParams.delete('page');
    navigate(`${location.pathname}?${searchParams.toString()}`);
  };

  const handleUserClear = () => {
    const searchParams = new URLSearchParams(location.search);
    searchParams.delete('targetID');
    searchParams.delete('targetUsername');
    searchParams.delete('page');
    navigate(`${location.pathname}?${searchParams.toString()}`);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const searchParams = new URLSearchParams(location.search);
    if (searchInput.trim()) {
      searchParams.set('search', searchInput.trim());
    } else {
      searchParams.delete('search');
    }
    searchParams.delete('page'); // reset to page 1 on new search
    navigate(`${location.pathname}?${searchParams.toString()}`);
  };

  const handleSearchClear = () => {
    setSearchInput('');
    const searchParams = new URLSearchParams(location.search);
    searchParams.delete('search');
    searchParams.delete('page');
    navigate(`${location.pathname}?${searchParams.toString()}`);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    const newQueryParams = { ...currentFilters, page: newPage };
    navigate({ search: stringifyQuery(newQueryParams) });
    setSuccessMessage('');
    setError('');
  };

  const openEditRow = (audioID) => {
    setEditAudioID(editAudioID === audioID ? null : audioID);
    const audioToEdit = audioList.find(audio => audio.audioID === audioID);
    if (audioToEdit) {
      setEditedRecord(audioToEdit);
    }
  };

  const togglePlayAudio = (filename, event) => {
    const newSrc = `${audioBaseURL}/${filename}`;
    document.querySelectorAll('.listen button').forEach(btn => {
      btn.classList.remove('active');
    });
  
    if (playingAudio.src === newSrc && playingAudio.playing) {
      audioRef.current.pause();
      setPlayingAudio({ src: "", playing: false });
    } else {
      if (audioRef.current.src !== newSrc) {
        audioRef.current.src = newSrc;
      }
      audioRef.current.play();
      setPlayingAudio({ src: newSrc, playing: true });
      event.currentTarget.classList.add('active');
    }
  };    
  
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent form from causing a page reload
    await dispatch(audioUpdate({ audioRecord: editedRecord }))
      .unwrap()
      .then(response => {
        setSuccessMessage('Audio updated successfully');
        setError('');
        setEditAudioID(null); // Close the edit form
        setUpdateTrigger(prev => !prev); // Toggle the trigger to cause re-fetch
      })
      .catch(error => {
        console.error("Error updating audio:", error);
        setError(error || 'Failed to update audio.');
      });
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
              <div className="search-box">
                <form onSubmit={handleSearch}>
                  <div className="search-input-wrap">
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Search title, tags, comments..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                    />
                    {searchInput && (
                      <button type="button" className="search-clear" onClick={handleSearchClear} aria-label="Clear search">×</button>
                    )}
                  </div>
                  <button type="submit" className="button search-submit">Search</button>
                </form>
              </div>
              <div className="top-controls">
                <div className="filter-box">
                  {(() => {
                    const activeFilter = new URLSearchParams(location.search).get('filter') || 'all';
                    const activeUser = new URLSearchParams(location.search).get('targetID');
                    const chipClass = (name) => `link filter-chip${activeFilter === name ? ' active' : ''}`;
                    return (
                      <ul>
                        <li><button className={chipClass('all')} onClick={() => handleFilter('all')}>All</button></li>
                        <li><button className={chipClass('review')} onClick={() => handleFilter('review')}>Review</button></li>
                        <li><button className={chipClass('approved')} onClick={() => handleFilter('approved')}>Approved</button></li>
                        <li><button className={chipClass('disapproved')} onClick={() => handleFilter('disapproved')}>Disapproved</button></li>
                        <li><button className={chipClass('trash')} onClick={() => handleFilter('trash')}>Trash</button></li>
                        {activeUser && (
                          <li>
                            <button className="link filter-chip active filter-chip-user" onClick={handleUserClear}>
                              {new URLSearchParams(location.search).get('targetUsername') || activeUser} ×
                            </button>
                          </li>
                        )}
                      </ul>
                    );
                  })()}
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
                    <th className="classification">Type</th>
                    <th className="tags">Tags</th>
                    <th className="listen">Listen</th>
                  </tr>
                </thead>
                <tbody>
                  {audioList.map((audio, index) => (
                    <React.Fragment key={audio.audioID}>
                      <tr className={index % 2 === 0 ? 'row-even' : 'row-odd'}>
                        <td className="id">{audio.audioID}</td>
                        <td className="title">
                          <div>{audio.title}</div>
                          <div>
                            <ul className="action-list">
                              <li><Link to={`/audio/view/${audio.audioID}`}>View</Link></li>
                              <li><Link to={`/audio/edit/${audio.audioID}`}>Edit</Link></li>
                              <li><button className="link" onClick={() => openEditRow(audio.audioID)}>Quick Edit</button></li>
                              <li><button className="link" onClick={() => audioTrash(audio.audioID)}>Trash</button></li>
                            </ul>
                          </div>
                        </td>
                        <td className="author">
                          <div className="authorline">
                            Upload:&nbsp;
                            <button className="link"
                              onClick={() => handleUserFilter(audio.creatorID, audio.creatorUsername)}>
                              {audio.creatorUsername}
                            </button>
                            &nbsp;on {formatDateAsFriendlyDate(audio.createDate)}
                          </div>
                          {audio.editorUsername && (
                            <div className="authorline">
                              Edit:&nbsp;
                              <button className="link"
                                onClick={() => handleUserFilter(audio.editorID, audio.editorUsername)}>
                                {audio.editorUsername}
                              </button> 
                              &nbsp;on {formatDateAsFriendlyDate(audio.editDate)}
                            </div>
                          )}
                        </td>
                        <td className="duration">{formatDuration(audio.duration)}</td>
                        <td className="status">{audio.status}</td>
                        <td className="classification">{formatListAsString(audio.classification)}</td>
                        <td className="tags">{formatListAsString(audio.tags)}</td>
                        <td className="listen">
                          <button className="icon" onClick={(e) => togglePlayAudio(audio.filename, e)}>
                            <AudioOn className="icon active" />
                          </button>
                        </td>
                      </tr>
                      {/* quick edit fields */}
                      {editAudioID === audio.audioID && (
                        <tr className={`${index % 2 === 0 ? 'row-even' : 'row-odd'} quick-edit`}>
                          <td colSpan="8">
                            <div className="form-group">
                              <form onSubmit={(e) => handleSubmit(e)}>
                                <div className="space-y-1">
                                  <div className="flex items-center space-x-2">
                                    <label className="block text-sm font-medium text-gray-700" htmlFor="title">Title:</label>
                                    <input
                                      type="text"
                                      name="title"
                                      value={editedRecord.title || ''}
                                      onChange={(e) => setEditedRecord({ ...editedRecord, title: e.target.value })}
                                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
                                    />
                                  </div>
                                  <div className="flex items-center space-x-4">
                                    <div className="flex items-center space-x-2 flex-none">
                                      <label className="block text-sm font-medium text-gray-700" htmlFor="status">Status:</label>
                                      <select
                                        name="status"
                                        value={editedRecord.status || ''}
                                        onChange={(e) => setEditedRecord({ ...editedRecord, status: e.target.value })}
                                        className="mt-1 block rounded-md border-gray-300 shadow-sm sm:text-sm"
                                      >
                                        <option value="Approved">Approved</option>
                                        <option value="Review">Review</option>
                                        <option value="Disapproved">Disapproved</option>
                                        <option value="Trash">Trash</option>
                                      </select>
                                    </div>
                                    <div className="flex items-center space-x-2 flex-grow">
                                      <label className="block text-sm font-medium text-gray-700" htmlFor="classification">Classification:</label>
                                      <input
                                        type="text"
                                        name="classification"
                                        value={editedRecord.classification || ''}
                                        onChange={(e) => setEditedRecord({ ...editedRecord, classification: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
                                      />
                                    </div>
                                    <div className="flex items-center space-x-2 flex-grow">
                                      <label className="block text-sm font-medium text-gray-700" htmlFor="tags">Tags:</label>
                                      <input
                                        type="text"
                                        name="tags"
                                        value={editedRecord.tags || ''}
                                        onChange={(e) => setEditedRecord({ ...editedRecord, tags: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <label className="block text-sm font-medium text-gray-700" htmlFor="comments">Comments:</label>
                                    <textarea
                                      name="comments"
                                      value={editedRecord.comments || ''}
                                      onChange={(e) => setEditedRecord({ ...editedRecord, comments: e.target.value })}
                                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
                                    />
                                  </div>
                                  <div className="flex justify-end">
                                    <button className="bg-blue-500 text-white rounded-md py-2 px-4 hover:bg-blue-600" type="submit">
                                      Update
                                    </button>
                                  </div>
                                </div>
                              </form>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
              <div className="bottom-controls">
                {renderPagination(totalRecords, recordsPerPage, page, handlePageChange)}
              </div>
              <audio className="audioPlayer" ref={audioRef} controls onEnded={() => {
                  document.querySelectorAll('.listen button').forEach(btn => btn.classList.remove('active'));
                  setPlayingAudio({ ...playingAudio, playing: false });
                }}></audio>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );  
}

export default AudioList;
