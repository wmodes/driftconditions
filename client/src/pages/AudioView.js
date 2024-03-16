// AudioView - View details of an audio file

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { audioInfo } from '../store/audioSlice';
import { initWaveSurfer, destroyWaveSurfer } from '../utils/waveUtils';

import { formatDateForDisplay, formatListForDisplay } from '../utils/formatUtils';
import FeatherIcon from 'feather-icons-react';

// Import the config object from the config.js file
const config = require('../config/config');
// pull variables from the config object
const audioBaseURL = config.server.audioBaseURL;

function AudioView() {
  const { audioID } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [isDomReady, setIsDomReady] = useState(false);
  const waveSurferRef = useRef(null);

  // Success and error handling
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [audioDetails, setAudioDetails] = useState({
    title: '',
    filename: '',
    status: '',
    classification: '',
    tags: '',
    comments: '',
    uploader_id: '',
    upload_date: '',
    duration: '',
    file_type: '',
    copyright_cert: 0,
  });

  useEffect(() => {
    if (!audioID) return;
    setIsLoading(true); // Start loading

    dispatch(audioInfo(audioID))
      .unwrap()
      .then(response => {
        setAudioDetails({
          ...response,
          classification: formatListForDisplay(response.classification),
          tags: formatListForDisplay(response.tags),
          upload_date: formatDateForDisplay(response.upload_date),
        });
        setIsLoading(false); // Stop loading once data is fetched
      })
      .catch(err => {
        console.error('Error fetching audio details:', err);
        setError('Failed to fetch audio details.');
        setIsLoading(false); // Stop loading on error
      });
  }, [audioID, dispatch]);

  // This useEffect ensures the component is mounted before initializing WaveSurfer
  useEffect(() => {
    setIsDomReady(true);
    // console.log('Component mounted');
  }, []);

  // initialize WaveSurfer once the component is mounted and audioDetails.filename is available
  useEffect(() => {  //
    if (isDomReady && audioDetails.filename) {
      const audioURL = `${audioBaseURL}/${audioDetails.filename}`;
      // check if waveSurferRef.current is already initialized
      if (waveSurferRef.current) {
        destroyWaveSurfer();
      }
      // Initialize a new WaveSurfer instance
      initWaveSurfer(audioURL, (wavesurfer) => {
        // console.log('WaveSurfer is ready:', wavesurfer);
      }).then(wavesurfer => {
        waveSurferRef.current = wavesurfer;
      });
    }
    // Cleanup function to destroy WaveSurfer instance on component unmount
    return () => {  //
      if (waveSurferRef.current) {
        destroyWaveSurfer();
      }
    };
  }, [isDomReady, audioDetails.filename]);

  // Function to render advanced pagination buttons with navigation controls
  const renderBreadcrumbs = () => {
    return (
      <div className="breadcrumb-box">
        <span className="link" onClick={() => navigate('/audio/list')}>
          <FeatherIcon icon="arrow-left" />List
        </span>
        <span className="link" onClick={() => navigate(`/audio/edit/${audioID}`)}>
          Edit
        </span>
      </div>
    );
  };

  return (
    <div className="edit-wrapper">
      <div className="display-box-wrapper">
        <div className="display-box">
          <h2 className='title'>View Audio Details</h2>
          <div className="form-group">
            <div className="form-row">
              <span className="form-label">Title:</span>
              <span className="form-value">{audioDetails.title}</span>
            </div>
            <div className="form-row">
              <span className="form-label">Filename:</span>
              <span className="form-value">{audioDetails.filename}</span>
            </div>
            <div className="form-row">
              <span className="form-label">Status:</span>
              <span className="form-value">{audioDetails.status}</span>
            </div>
          </div>

          <div className="form-group">
            <div id="waveform"></div>
          </div>
  
          <div className="form-group">
            <div className="form-col">
              <div className="form-label">Classification:</div>
              <div className="form-value">
                {audioDetails.classification}
              </div>
            </div>
            <div className="form-col">
              <div className="form-label">Tags:</div>
              <div className="form-value">{audioDetails.tags}</div>
            </div>
            <div className="form-col">
              <div className="form-label">Comments:</div>
              <div className="form-value">{audioDetails.comments}</div>
            </div>
          </div>

          <div className='message-box'>
            {isLoading && <p className="success">Loading...</p>}
            {error && <p className="error">{error}</p>}
          </div>
  
          {renderBreadcrumbs()}
        </div>
      </div>
    </div>
  );  
}

export default AudioView;
