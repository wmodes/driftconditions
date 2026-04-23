// AudioEdit.js - Edit audio details

// TODO: Link back to List at top of form 

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { audioInfo, audioUpdate } from '../store/audioSlice';
import { initWaveSurfer, destroyWaveSurfer } from '../utils/waveUtils';

// unsavedChanges: global state, listeners, and handlers
import { setUnsavedChanges } from '../store/formSlice';
import { useUnsavedChangesEvents, SafeLink, useSafeNavigate } from '../utils/formUtils';

import { formatDateAsFriendlyDate, setClassificationFormOptions,
  formatClassificationForDB, formatDuration } from '../utils/formatUtils';
import { ClassificationCheckboxes, TagInput } from '../utils/formUtils';

// import FeatherIcon from 'feather-icons-react';

// Import the config object from the config.js file
import config from '../config/config';
// pull variables from the config object
const audioBaseURL = config.adminServer.audioBaseURL;
const coverImageURLBase = config.app.coverImageURLBase;
const adminServerBaseURL = config.adminServer.baseURL;
const classificationOptions = config.audio.classification;
const fieldNotes = config.audio.fieldNotes;

function AudioEdit() {
  const { audioID } = useParams();
  const dispatch = useDispatch();
  const navigate = useSafeNavigate();

  const { user: userAuth } = useSelector((state) => state.auth);
  const [specialTagsPerm, setSpecialTagsPerm] = useState(false);

  useEffect(() => {
    if (!userAuth?.permissions) return;
    if (userAuth.permissions.indexOf('specialTags') !== -1) setSpecialTagsPerm(true);
  }, [userAuth.permissions]);

  // Call the useUnsavedChangesEvents hook to create event listeners
  useUnsavedChangesEvents();

  // Reset unsaved changes flag on mount so we don't inherit stale state from a previous page
  useEffect(() => {
    dispatch(setUnsavedChanges(false));
  }, [dispatch]);

  const [isDomReady, setIsDomReady] = useState(false);
  const waveSurferRef = useRef(null);

  // Success and error handling
  // eslint-disable-next-line no-unused-vars
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  // Cover image upload state
  const [coverImageFile, setCoverImageFile] = useState(null);
  const [coverImagePreview, setCoverImagePreview] = useState(null);

  // State for managing form inputs
  const [record, setRecord] = useState({
    // turn classificationOptions into an object with keys for each option (set to false)
    classification: {},
    copyrightCert: 0,
    notifyContributor: true,
  });
  // Track the status at load time so we can gray out Notify until it changes
  const [originalStatus, setOriginalStatus] = useState('');

  useEffect(() => {
    if (!audioID) return;
    setIsLoading(true); // Start loading

    dispatch(audioInfo({audioID}))
      .unwrap()
      .then(response => {
        // Parse and transform the response as needed
        // console.log('Fetched audio details:', response);
        // console.log('Classification:', response.classification, 'type:', typeof response.classification);
        setOriginalStatus(response.status);
        setRecord(prevState => ({
          ...prevState,
          ...response,
          // tags: formatTagsAsString(response.tags),
          createDate: formatDateAsFriendlyDate(response.createDate),
          editDate: formatDateAsFriendlyDate(response.editDate),
          classification: setClassificationFormOptions(classificationOptions, response.classification),
          notifyContributor: true,
        }));
        setIsLoading(false); // Stop loading once data is fetched
      })
      .catch(err => {
        console.error('Error fetching audio details:', err);
        setError(err || 'Failed to fetch audio details.');
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

  const handleInternalTagChange = (newTags) => {
    dispatch(setUnsavedChanges(true));
    setRecord(prevState => ({ ...prevState, internalTags: newTags }));
  };

  const handleCoverImageSave = async () => {
    if (!coverImageFile) return;
    try {
      const formData = new FormData();
      formData.append('coverImage', coverImageFile);
      const res = await fetch(`${adminServerBaseURL}/api/audio/cover/${audioID}`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!res.ok) throw new Error((await res.json()).error?.message || 'Upload failed');
      const data = await res.json();
      // Update coverImage in local record so the preview refreshes
      setRecord(prev => ({ ...prev, coverImage: data.coverImage }));
      setCoverImageFile(null);
      setCoverImagePreview(null);
    } catch (err) {
      console.error('Cover image save error:', err.message);
    }
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
      .then(async () => {
        // Save cover image alongside metadata if one was selected
        if (coverImageFile) await handleCoverImageSave();
        setSuccessMessage('Update successful!');
        setError('');
        dispatch(setUnsavedChanges(false));
      })
      .catch(err => {
        console.error('Update error:', err);
        setSuccessMessage('');
        setError(err || 'Failed to update audio.');
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

  // Check if required fields are filled and at least one classification is true
  const isFormValid = record.title && record.copyrightCert && record.classification && record.tags && Object.values(record.classification).includes(true);
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
          <li className="link"><SafeLink to={'/audio/view/' + audioID}>View</SafeLink></li>
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
              <div className="form-group-with-image">
                <div className="form-fields">
                  <label className="form-label" htmlFor="title">Title: <Required /></label>
                  <input className="form-field" type="text" id="title" name="title" value={record.title || ""} onChange={handleChange} />

                  <div className="form-row">
                    <label className="form-label">Filename: <Required /></label> <span className="non-editable">{record.filename}</span>
                  </div>

                  <div className="form-row">
                    <label className="form-label">Author: <Required /></label> <span className="non-editable">{record.creatorUsername}</span>
                  </div>

                  <div className="form-row">
                    <label className="form-label">Date: <Required /></label> <span className="non-editable">{record.createDate}</span>
                  </div>

                  <div className="form-row">
                    <label className="form-label" htmlFor="status">Status: <Required /></label>
                    <select name="status" value={record.status || ''} onChange={handleChange} className="form-select">
                      <option value="Review">Under Review</option>
                      <option value="Approved">Approved</option>
                      <option value="Disapproved">Disapproved</option>
                      <option value="Trashed">Trashed</option>
                    </select>
                    <label
                      className="form-label checkbox-label"
                      style={{
                        marginLeft: '1rem',
                        color: (record.status === originalStatus || (record.status !== 'Approved' && record.status !== 'Disapproved')) ? '#999' : 'inherit',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={record.notifyContributor || false}
                        disabled={
                          record.status === originalStatus ||
                          (record.status !== 'Approved' && record.status !== 'Disapproved')
                        }
                        onChange={(e) => setRecord(prev => ({ ...prev, notifyContributor: e.target.checked }))}
                      />
                      {' '}Notify contributor
                    </label>
                  </div>
                  <p className="form-note mt-1">Approval/Disapproval notes go in comments below, sent to contributor</p>

                  <div className="form-row">
                    <label className="form-label">Plays:</label> <span className="non-editable">{record.timesUsed || '—'}</span>
                  </div>
                </div>

                <div className="cover-image-panel">
                  {coverImagePreview ? (
                    <img className="cover-image" src={coverImagePreview} alt="Cover preview" />
                  ) : record.coverImage ? (
                    <img className="cover-image" src={`${coverImageURLBase}/${record.coverImage}.jpg`} alt="Cover" />
                  ) : (
                    <div className="cover-image-placeholder">No cover image</div>
                  )}
                  <div className="cover-image-upload">
                    <input
                      type="file"
                      id="coverImageInput"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files[0] || null;
                        setCoverImageFile(file);
                        setCoverImagePreview(file ? URL.createObjectURL(file) : null);
                      }}
                    />
                    <label
                      htmlFor="coverImageInput"
                      className="cover-image-upload-btn"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files[0] || null;
                        if (!file) return;
                        setCoverImageFile(file);
                        setCoverImagePreview(URL.createObjectURL(file));
                      }}
                    >
                      Choose Image
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="form-group pb-2">
              <div id="waveform"></div>
              <div className="text-sm mt-1">Duration: {formatDuration(record.duration)}</div>
            </div>

            <div className="form-group">

              <label className="form-label" htmlFor="title">Classification: <Required /></label>
              <ClassificationCheckboxes
                classification={record.classification}
                handleChange={handleChange}
              />
              <p className="form-note">{fieldNotes.classification}</p>

              <label className="form-label" htmlFor="tags">Tags: <Required /></label>
              {record?.tags !== undefined && (        
                <TagInput
                  initialTags={record.tags}
                  onTagChange={handleTagChange}
                />
              )}
              <p className="form-note mt-1">{fieldNotes.tags || ""}</p>

              {specialTagsPerm && (
                <>
                  <label className="form-label" htmlFor="internalTags">Internal Tags:</label>
                  {record?.internalTags !== undefined && (
                    <TagInput
                      initialTags={record.internalTags}
                      onTagChange={handleInternalTagChange}
                    />
                  )}
                </>
              )}

              <label className="form-label" htmlFor="comments">Comments:</label>
              <textarea className="form-textarea" id="comments" name="comments" value={record.comments || ""} onChange={handleChange}></textarea>
            </div>

            <div className='button-box'>
              <button className='button cancel' type="button" onClick={() => navigate(`/audio/view/${audioID}`)}>Cancel</button>
              <button className='button submit' type="submit" disabled={!isFormValid}>Save Changes</button>
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
