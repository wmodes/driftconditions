// AudioEdit.js - Edit audio details

// TODO: Link back to List at top of form 

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { audioInfo, audioUpdate } from '../store/audioSlice';
import { initWaveSurfer, destroyWaveSurfer } from '../utils/waveUtils';

// unsavedChanges: global state, listeners, and handlers
import { setUnsavedChanges } from '../store/formSlice';
import { useUnsavedChangesEvents, SafeLink, useSafeNavigate } from '../utils/formUtils';

import { formatDateAsFriendlyDate, setClassificationFormOptions, 
  formatClassificationForDB } from '../utils/formatUtils';
import { ClassificationCheckboxes, TagInput } from '../utils/formUtils';

// import FeatherIcon from 'feather-icons-react';

// Import the config object from the config.js file
import config from '../config/config';
// pull variables from the config object
const audioBaseURL = config.adminServer.audioBaseURL;
const classificationOptions = config.audio.classification;
const fieldNotes = config.audio.fieldNotes;

function AudioEdit() {
  const { audioID } = useParams();
  const dispatch = useDispatch();
  // const navigate = useNavigate();
  const navigate = useSafeNavigate();

  // Call the useUnsavedChangesEvents hook to create event listeners
  useUnsavedChangesEvents();

  const [isDomReady, setIsDomReady] = useState(false);
  const waveSurferRef = useRef(null);

  // Success and error handling
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  // State for managing form inputs
  const [record, setRecord] = useState({
    // turn classificationOptions into an object with keys for each option (set to false)
    classification: setClassificationFormOptions(classificationOptions, false),
    copyrightCert: 0,
  });

  useEffect(() => {
    if (!audioID) return;
    setIsLoading(true); // Start loading

    dispatch(audioInfo({audioID}))
      .unwrap()
      .then(response => {
        // Parse and transform the response as needed
        // console.log('Fetched audio details:', response);
        // console.log('Classification:', response.classification, 'type:', typeof response.classification);
        setRecord(prevState => ({
          ...prevState,
          ...response,
          // tags: formatTagsAsString(response.tags),
          createDate: formatDateAsFriendlyDate(response.createDate),
          editDate: formatDateAsFriendlyDate(response.editDate),
          classification: setClassificationFormOptions(classificationOptions, response.classification),
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
    dispatch(setUnsavedChanges(true));
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      // Handle classification checkbox change
      setRecord(prevState => ({
        ...prevState,
        classification: { ...prevState.classification, [name]: checked }
      }));
    } else {
      setRecord(prevState => ({ ...prevState, [name]: value }));
    }
  };

  const handleTagChange = (newTags) => {
    dispatch(setUnsavedChanges(true));
    setRecord(prevState => ({ ...prevState, tags:newTags }));
    // console.log('AudioEdit new tags:', newTags);
  };

  const handleSubmit = (e) => { 
    e.preventDefault();
    // Prep fields before submitting
    const adjustedRecord = {
      ...record,
      // tags: formatTagStrAsArray(record.tags),
      classification: formatClassificationForDB(record.classification),
    };
    dispatch(audioUpdate({audioRecord: adjustedRecord}))
      .unwrap()
      .then(() => {
        setSuccessMessage('Update successful!');
        setError('');
        dispatch(setUnsavedChanges(false));
      })
      .catch(err => {
        console.error('Update error:', err);
        setError('Failed to update audio.');
      });
  };

  // This useEffect ensures the component is mounted before initializing WaveSurfer
  useEffect(() => {
    setIsDomReady(true);
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

  const Required = () => <span className="required">*</span>;

  // const prepLabel = (text) => text
  //   .replace(/([A-Z])/g, ' $1')
  //   .replace(/^./, match => match.toUpperCase())
  //   .trim();

  // Function to render breadcrumbs
  const renderBreadcrumbs = () => {
    return (
      <div className="breadcrumb-box">
        <ul className="breadcrumb">
          <li className="link"><SafeLink to="/audio/list">List</SafeLink></li>
          <li className="link"><SafeLink to="/audio/upload">Add New</SafeLink></li>
          <li className="link"><SafeLink to={'/audio/view/' + audioID}>Views</SafeLink></li>
        </ul>
      </div>
    );
  };

  return (
    <div className="edit-wrapper">
      <div className="display-box-wrapper">
        <div className="display-box">
          <form onSubmit={handleSubmit}>
            <h2 className='title'>Edit Audio</h2>
            {renderBreadcrumbs()}
            <div className="form-group">
              <label className="form-label" htmlFor="title">Title: <Required /></label>
              <input className="form-field" type="text" id="title" name="title" value={record.title || ""} onChange={handleChange} />
              
              <div className="mb-2">
                <label className="form-label">Filename:</label> <span className="non-editable">{record.filename}</span>
              </div>
              
              <div className="mb-2">
                <label className="form-label">Author:</label> <span className="non-editable">{record.creatorUsername}</span>
              </div>
              
              <div className="mb-2">
                <label className="form-label">Date:</label> <span className="non-editable">{record.createDate}</span>
              </div>


              <label className="form-label" htmlFor="status">Status:</label>
              <select name="status" value={record.status} onChange={handleChange} className="form-select">
                <option value="Review">Under Review</option>
                <option value="Approved">Approved</option>
                <option value="Disapproved">Disapproved</option>
                <option value="Trashed">Trashed</option>
              </select>
            </div>

            <div className="form-group pb-2">
              <div id="waveform"></div>
              <div className="text-sm mt-1">Duration: {record.duration}s</div>
            </div>

            <div className="form-group">

              <label className="form-label" htmlFor="title">Classification:</label>
              <ClassificationCheckboxes
                classification={record.classification}
                handleChange={handleChange}
              />
              <p className="form-note">{fieldNotes.classification}</p>

              <label className="form-label" htmlFor="tags">Tags:</label>
              {record?.tags !== undefined && (        
                <TagInput
                  initialTags={record.tags}
                  onTagChange={handleTagChange}
                />
              )}
              <p className="form-note mt-1">{fieldNotes.tags || ""}</p>

              <label className="form-label" htmlFor="comments">Comments:</label>
              <textarea className="form-textarea" id="comments" name="comments" value={record.comments || ""} onChange={handleChange}></textarea>
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
