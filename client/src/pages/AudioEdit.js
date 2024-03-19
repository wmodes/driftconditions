// AudioEdit.js - Edit audio details

// TODO: Link back to List at top of form 

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { audioInfo, audioUpdate } from '../store/audioSlice';
import { initWaveSurfer, destroyWaveSurfer } from '../utils/waveUtils';
import { formatDateForDisplay, formatTagStrForDB, formatTagsForDisplay } from '../utils/formatUtils';
import FeatherIcon from 'feather-icons-react';

// Import the config object from the config.js file
import config from '../config/config';
// pull variables from the config object
const audioBaseURL = config.server.audioBaseURL;
const classificationOptions = config.audio.classification;
const fieldNotes = config.audio.fieldNotes;

function AudioEdit() {
  const { audioID } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [isDomReady, setIsDomReady] = useState(false);
  const waveSurferRef = useRef(null);

  // Success and error handling
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  // State for managing form inputs
  const [audioRecord, setAudioRecord] = useState({
    // turn classificationOptions into an object with keys for each option (set to false)
    classification: classificationOptions.reduce((acc, option) => {
      acc[option] = false;
      return acc;
    }, {}),
    copyright_cert: 0,
  });

  useEffect(() => {
    if (!audioID) return;
    setIsLoading(true); // Start loading

    dispatch(audioInfo(audioID))
      .unwrap()
      .then(response => {
        // Parse and transform the response as needed
        setAudioRecord(prevState => ({
          ...prevState,
          ...response,
          tags: formatTagsForDisplay(response.tags),
          create_date: formatDateForDisplay(response.create_date),
          edit_date: formatDateForDisplay(response.edit_date),
          classification: response.classification.reduce((acc, curr) => ({
            ...acc,
            [curr]: true
          }), {...audioRecord.classification})
        }));
        setIsLoading(false); // Stop loading once data is fetched
      })
      .catch(err => {
        console.error('Error fetching audio details:', err);
        setError('Failed to fetch audio details.');
        setIsLoading(false); // Stop loading on error
      });
  }, [audioID, dispatch]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      // Handle classification checkbox change
      setAudioRecord(prevState => ({
        ...prevState,
        classification: { ...prevState.classification, [name]: checked }
      }));
    } else {
      setAudioRecord(prevState => ({ ...prevState, [name]: value }));
    }
  };

  const handleSubmit = (e) => { 
    e.preventDefault();
    // Prep fields before submitting
    const updatedRecord = {
      ...audioRecord,
      tags: formatTagStrForDB(audioRecord.tags),
      classification: Object.keys(audioRecord.classification).filter(key => audioRecord.classification[key])
    };
    dispatch(audioUpdate({audioID, ...updatedRecord}))
      .unwrap()
      .then(() => {
        setSuccessMessage('Update successful!');
        setError('');
        // Update audioDetails state with normalized values to reflect in the input field
        setAudioRecord(prevState => ({
          ...prevState,
          // Convert array back to string for input field
          tags: formatTagsForDisplay(updatedRecord.tags) 
        }));
      })
      .catch(err => {
        console.error('Update error:', err);
        setError('Failed to update audio.');
      });
  };

  // This useEffect ensures the component is mounted before initializing WaveSurfer
  useEffect(() => {
    setIsDomReady(true);
    // s('Component mounted');
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

  const Required = () => <span className="required">*</span>;

  const prepLabel = (text) => text
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, match => match.toUpperCase())
    .trim();

  // Function to render advanced pagination buttons with navigation controls
  const renderBreadcrumbs = () => {
    return (
      <div className="breadcrumb-box">
        <span className="link" onClick={() => navigate('/audio/list')}>
          <FeatherIcon icon="arrow-left" />List
        </span>
        <span className="link" onClick={() => navigate(`/audio/view/${audioID}`)}>
          View
        </span>
      </div>
    );
  };

  return (
    <div className="edit-wrapper">
      <div className="display-box-wrapper">
        <div className="display-box">
          <form onSubmit={handleSubmit}>
            <h2 className='title'>Edit Audio</h2>
            <div className="form-group">
              <label className="form-label" htmlFor="title">Title: <Required /></label>
              <input className="form-field" type="text" id="title" name="title" value={audioRecord.title} onChange={handleChange} />
              
              <div className="mb-2">
                <label className="form-label">Filename:</label> <span className="non-editable">{audioRecord.filename}</span>
              </div>
              
              <div className="mb-2">
                <label className="form-label">Author:</label> <span className="non-editable">{audioRecord.creator_username}</span>
              </div>
              
              <div className="mb-2">
                <label className="form-label">Date:</label> <span className="non-editable">{audioRecord.create_date}</span>
              </div>


              <label className="form-label" htmlFor="status">Status:</label>
              <select name="status" value={audioRecord.status} onChange={handleChange} className="form-select">
                <option value="Review">Under Review</option>
                <option value="Approved">Approved</option>
                <option value="Disapproved">Disapproved</option>
                <option value="Trashed">Trashed</option>
              </select>
            </div>

            <div className="form-group">
              <div id="waveform"></div>
            </div>

            <div className="form-group">

              <label className="form-label" htmlFor="title">Category:</label>
              <div className="form-checkbox">
                {Object.entries(audioRecord.classification).map(([key, value]) => (
                  <div className="checkbox-field" key={key}>
                    <input
                      type="checkbox"
                      id={key}
                      name={key}
                      checked={value}
                      onChange={handleChange}
                    />
                    <label htmlFor={key}> {prepLabel(key)}</label>
                  </div>
                ))}
              </div>
              <p className="form-note">{fieldNotes.classification}</p>

              <label className="form-label" htmlFor="tags">Tags:</label>
              <input className="form-field" type="text" id="tags" name="tags" value={audioRecord.tags} onChange={handleChange} />
              <p className="form-note">{fieldNotes.tags}</p>

              <label className="form-label" htmlFor="comments">Comments:</label>
              <textarea className="form-textarea" id="comments" name="comments" value={audioRecord.comments} onChange={handleChange}></textarea>
            </div>

            <div className='button-box'>
              <button className='button cancel' type="button" onClick={() => navigate(`/audio/view/${audioID}`)}>Cancel</button>
              <button className='button submit' type="submit">Save Changes</button>
            </div>

            <div className='message-box'>
              {successMessage && <p className="success">{successMessage}</p>}
              {error && <p className="error">{error}</p>}
            </div>
          </form>
          {renderBreadcrumbs()}
        </div>
      </div>
    </div>
  );
}

export default AudioEdit;
