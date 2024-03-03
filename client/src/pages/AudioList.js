// AudioList.js - Edit audio details

// TODO: Modify URL to show audioID, sort, and filter


import React, { useEffect, useState } from 'react';
import { Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { audioList as audioListAction, audioTrash as audioTrashAction } from '../store/audioSlice';
import { parseQuery, stringifyQuery } from '../utils/queryUtils';

// Import the config object from the config.js file
const config = require('../config/config');
// pull variables from the config object
const recordsPerPage = config.audio.recordsPerPage;
const retryLimit = config.server.retryLimit;

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

  // Success and error handling
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [successMessage, setSuccessMessage] = useState(''); // State for success message
  const [error, setError] = useState(''); // State for general errors
  const [criticalError, setCriticalError] = useState('');

  // Parse current URL search params
  const currentFilters = parseQuery(location.search);

  useEffect(() => {
    if (!isAuthenticated || retryAttempt >= retryLimit || !isLoading) return;
    setIsLoading(true); // Start loading

    const queryParams = { ...currentFilters, page, recordsPerPage };

    dispatch(audioListAction({ queryParams }))
      .unwrap()
      .then(response => {
        console.log("Response: ", response);
        console.log("Audio List:", response.audioList, "Total Records:", response.totalRecords);
        // Assuming the response includes the list of audio records and the total number of records
        setAudioList(response.audioList);
        setTotalRecords(response.totalRecords);
        // setSuccessMessage('Audio list fetched successfully.'); // Update success message
        setIsLoading(false); // Stop loading once data is fetched
      })
      .catch(error => {
        console.error("Error fetching audio list:", error);
        setCriticalError('Failed to fetch audio list.'); 
        setAudioList([]);
        setIsLoading(false); // Stop loading on error
        setRetryAttempt(retryAttempt + 1); // Increment retry attempt
      });
    }, [dispatch, page, recordsPerPage, currentFilters, isAuthenticated, retryAttempt, isLoading]);

  const audioTrash = (audioId) => {
    dispatch(audioTrashAction({ audioId }))
      .unwrap()
      .then(() => {
        setSuccessMessage(`Audio ${audioId} trashed successfully.`);
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

  // Placeholder for roles check function
  // const hasPermission = (action) => {
  //   return ['editor', 'mod', 'admin'].includes(userRole); // Simplified, adjust as needed
  // };

  if (isAuthenticated === false) {
    return <Navigate to='/signin' replace={true} />;
  }


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
              <table className="audio-table">
                <thead>
                  <tr>
                    <th className="title">Title</th>
                    <th className="author">Authors</th>
                    <th className="duration">Duration</th>
                    <th className="status">Status</th>
                    <th className="classification">Classification</th>
                    <th className="tags">Tags</th>
                  </tr>
                </thead>
                <tbody>
                  {audioList.map(audio => (
                    <tr key={audio.audio_id}>
                      <td className="title">
                        <div>{audio.title}</div>
                        <div>
                          <ul className="action-list">
                            <li><Link to={`/view/${audio.audio_id}`}>View</Link></li>
                            <li><Link to={`/edit/${audio.audio_id}`}>Edit</Link></li>
                            <li><button onClick={() => audioTrash(audio.audio_id)}>Trash</button></li>
                          </ul>
                        </div>
                      </td>
                      <td className="author">
                        <div>Uploaded: {audio.uploader} on {audio.upload_date}</div>
                        <div>Edited: {audio.editor} on {audio.edit_date}</div>
                      </td>
                      <td className="duration">{audio.duration}</td>
                      <td className="status">{audio.status}</td>
                      <td className="classification">{typeof audio.classification} - {JSON.stringify(audio.classification)}</td>
                      <td className="tags">{typeof audio.tags} - {JSON.stringify(audio.tags)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="pagination">
                {/* Pagination controls */}
                {[...Array(Math.ceil(totalRecords / recordsPerPage)).keys()].map(n => (
                  <button key={n + 1} onClick={() => handlePageChange(n + 1)} disabled={page === n + 1}>
                    {n + 1}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default AudioList;