// AudioView - View details of an audio file

import React, { useEffect, useState, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { audioInfo } from '../store/audioSlice';
import { initWaveSurfer, destroyWaveSurfer } from '../utils/waveUtils';

import { formatDateAsFriendlyDate, formatListAsString } from '../utils/formatUtils';
import FeatherIcon from 'feather-icons-react';

// Import the config object from the config.js file
const config = require('../config/config');
// pull variables from the config object
const audioBaseURL = config.adminServer.audioBaseURL;

function AudioView() {
  const { audioID } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [isDomReady, setIsDomReady] = useState(false);
  const waveSurferRef = useRef(null);

  // Success and error handling
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [record, setRecord] = useState({
    copyrightCert: 0,
  });

  useEffect(() => {
    if (!audioID) return;
    setIsLoading(true); // Start loading

    dispatch(audioInfo({audioID}))
      .unwrap()
      .then(response => {
        setRecord({
          ...response,
          classification: formatListAsString(response.classification),
          tags: formatListAsString(response.tags),
          createDate: formatDateAsFriendlyDate(response.createDate),
          editDate: formatDateAsFriendlyDate(response.editDate),
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
    if (isDomReady && record.filename) {
      const audioURL = `${audioBaseURL}/${record.filename}`;
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
  }, [isDomReady, record.filename]);

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
              <span className="form-value">{record.title}</span>
            </div>

            <div className="form-row">
              <span className="form-label">Filename:</span>
              <span className="form-value">{record.filename}</span>
            </div>

            <div className="form-row">
              <span className="form-label">Created:</span>
              <span className="form-value">
                <Link to={`/recipe/list?filter=user&targetID=${record.creatorUsername}`}>
                  {record.creatorUsername}
                </Link>
                {" on " + record.createDate}
              </span>
            </div>

            {record.editorUsername && (
                <div className="form-row">
                  <span className="form-label">Edited:</span>
                  <span className="form-value">
                    <Link to={`/recipe/list?filter=user&targetID=${record.editorUsername}`}>
                      {record.editorUsername}
                    </Link>
                    {" on " + record.editDate}
                  </span>
                </div>
              )
            }
            
            <div className="form-row">
              <span className="form-label">Status:</span>
              <span className="form-value">{record.status}</span>
            </div>
          </div>

          <div className="form-group pb-2">
            <div id="waveform"></div>
            <div className="text-sm mt-1">Duration: {record.duration}s</div>
          </div>
  
          <div className="form-group">
            <div className="form-col">
              <div className="form-label">Classification:</div>
              <div className="form-value">
                {record.classification}
              </div>
            </div>
            <div className="form-col">
              <div className="form-label">Tags:</div>
              <div className="form-value">{record.tags}</div>
            </div>
            <div className="form-col">
              <div className="form-label">Comments:</div>
              <div className="form-value">{record.comments}</div>
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
