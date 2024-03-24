// AudioView - View details of an audio file

import React, { useEffect, useState, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useParams, useNavigate, Link } from 'react-router-dom';
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

  const [audioRecord, setAudioRecord] = useState({
    copyrightCert: 0,
  });

  useEffect(() => {
    if (!audioID) return;
    setIsLoading(true); // Start loading

    dispatch(audioInfo({audioID}))
      .unwrap()
      .then(response => {
        setAudioRecord({
          ...response,
          classification: formatListForDisplay(response.classification),
          tags: formatListForDisplay(response.tags),
          createDate: formatDateForDisplay(response.createDate),
          editDate: formatDateForDisplay(response.editDate),
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
    if (isDomReady && audioRecord.filename) {
      const audioURL = `${audioBaseURL}/${audioRecord.filename}`;
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
  }, [isDomReady, audioRecord.filename]);

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
    <div className="view-wrapper">
      <div className="display-box-wrapper">
        <div className="display-box">
          <h2 className='title'>View Audio Details</h2>
          <div className="form-group">
            <div className="form-row">
              <span className="form-label">Title:</span>
              <span className="form-value">{audioRecord.title}</span>
            </div>

            <div className="form-row">
              <span className="form-label">Filename:</span>
              <span className="form-value">{audioRecord.filename}</span>
            </div>

            <div className="form-row">
              <span className="form-label">Created:</span>
              <span className="form-value">
                <Link to={`/recipe/list?filter=user&targetID=${audioRecord.creatorUsername}`}>
                  {audioRecord.creatorUsername}
                </Link>
                {" on " + audioRecord.createDate}
              </span>
            </div>

            {audioRecord.editorUsername && (
                <div className="form-row">
                  <span className="form-label">Edited:</span>
                  <span className="form-value">
                    <Link to={`/recipe/list?filter=user&targetID=${audioRecord.editorUsername}`}>
                      {audioRecord.editorUsername}
                    </Link>
                    {" on " + audioRecord.editDate}
                  </span>
                </div>
              )
            }
            
            <div className="form-row">
              <span className="form-label">Status:</span>
              <span className="form-value">{audioRecord.status}</span>
            </div>
          </div>

          <div className="form-group">
            <div id="waveform"></div>
          </div>
  
          <div className="form-group">
            <div className="form-col">
              <div className="form-label">Classification:</div>
              <div className="form-value">
                {audioRecord.classification}
              </div>
            </div>
            <div className="form-col">
              <div className="form-label">Tags:</div>
              <div className="form-value">{audioRecord.tags}</div>
            </div>
            <div className="form-col">
              <div className="form-label">Comments:</div>
              <div className="form-value">{audioRecord.comments}</div>
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
