/**
 * @file AudioUpload.js - A page for uploading audio files
 */

// AudioUpload.js - A page for uploading audio files

import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { audioUpload } from '../store/audioSlice';
import { Waiting } from '../utils/appUtils';

import { setClassificationFormOptions, formatClassificationForDB, generateTitle } from '../utils/formatUtils';
import { ClassificationCheckboxes, TagInput } from '../utils/formUtils';

// unsavedChanges: global state, listeners, and handlers
import { setUnsavedChanges } from '../store/formSlice';
import { useUnsavedChangesEvents, SafeLink, useSafeNavigate } from '../utils/formUtils';

// Import the config object from the config.js file
import config from '../config/config';
// pull variables from the config object
const allowedFileTypes = config.audio.allowedFileTypes;
const classificationOptions = config.audio.classification;
const classificationFields = config.audio.classificationFields;
const fieldNotes = config.audio.fieldNotes;
const adminServerBaseURL = config.adminServer.baseURL;

function AudioUpload() {
  const dispatch = useDispatch();  
  const navigateOG = useNavigate();
  const navigate = useSafeNavigate;

  // Call the useUnsavedChanges hook to track unsaved changes and handle navigation
  useUnsavedChangesEvents();

  // get auth state from Redux store
  const { user: userAuth } = useSelector((state) => state.auth);
  const [editPerm, setEditPerm] = useState(false);

  // Check if the user has permission to edit audio
  useEffect(() => {
    if (userAuth.permissions.indexOf('audioEdit') !== -1) {
      setEditPerm(true);
    }
  }, [userAuth.permissions]);

  const fileInputRef = useRef(null);

  // Local state for managing form inputs
  const [file, setFile] = useState(null);
  const [uploadedAudioID, setUploadedAudioID] = useState(null);

  // Cover image state
  const [coverImageFile, setCoverImageFile] = useState(null);
  const [coverImagePreview, setCoverImagePreview] = useState(null);

  // Success and error handling
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(''); // New state for success message
  const [error, setError] = useState('');

  // State for managing form inputs
  const [record, setRecord] = useState({
    status: 'Review',
    // turn classificationOptions into an object with keys for each option (set to false)
    classification: setClassificationFormOptions(classificationOptions, false),
    copyrightCert: 0,
    tags: [],
  });

  /**
   * Handle form input changes.
   * @param {Event} e - The event object.
   */
  const handleChange = (e) => {
    dispatch(setUnsavedChanges(true));
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      if (name === 'copyrightCert') {
        setRecord(prevState => ({
          ...prevState,
          [name]: checked
        }));
      } else {
        setRecord(prevState => ({
          ...prevState,
          classification: { ...prevState.classification, [name]: checked }
        }));
      }
    } else {
      setRecord(prevState => ({ ...prevState, [name]: value }));
    }
  };

  /**
   * Generate and set the title based on the file name.
   * @param {File} file - The file object.
   */
  const generateAndSetTitle = (file) => {
    if (!record.title) {
      const title = generateTitle(file);
      setRecord(prevState => ({ ...prevState, title }));
    }
  };

  /**
   * Handle file input changes.
   * @param {Event} e - The event object.
   */
  const handleFileChange = (e) => {
    dispatch(setUnsavedChanges(true));
    const selectedFile = e.target.files[0];
    if (selectedFile && allowedFileTypes.includes(selectedFile.type)) {
      setFile(selectedFile);
      generateAndSetTitle(selectedFile);
      setError(''); // Clear any previous error message
    } else {
      e.target.value = ''; // Clears the file input
      console.error("Invalid file type:", selectedFile?.type);
      setError('Invalid file type. Please select a valid audio file.');
    }
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files[0];
    if (!droppedFile) return;
    // Inject dropped file into the native input so it shows the filename
    if (fileInputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(droppedFile);
      fileInputRef.current.files = dt.files;
    }
    dispatch(setUnsavedChanges(true));
    if (allowedFileTypes.includes(droppedFile.type)) {
      setFile(droppedFile);
      generateAndSetTitle(droppedFile);
      setError('');
    } else {
      console.error("Invalid file type:", droppedFile.type);
      setError('Invalid file type. Please select a valid audio file.');
    }
  };

  /**
   * Handle tag input changes.
   * @param {Array} newTags - The updated tags array.
   */
  const handleTagChange = (newTags) => {
    dispatch(setUnsavedChanges(true));
    setRecord(prevState => ({ ...prevState, tags: newTags }));
  };

  /**
   * Handle form submission.
   * @param {Event} e - The event object.
   */
  const handleSubmit = e => {
    e.preventDefault();
    setIsLoading(true);
    const adjustedRecord = {
      ...record,
      classification: formatClassificationForDB(record.classification),
      copyrightCert: record.copyrightCert ? 1 : 0
    };
    dispatch(audioUpload({ audioRecord: adjustedRecord, file }))
      .unwrap()
      .then(async response => {
        // Save cover image if one was selected
        if (coverImageFile && response.audioID) {
          const formData = new FormData();
          formData.append('coverImage', coverImageFile);
          await fetch(`${adminServerBaseURL}/api/audio/cover/${response.audioID}`, {
            method: 'POST',
            credentials: 'include',
            body: formData,
          });
        }
        setIsLoading(false);
        setSuccessMessage('Upload successful!');
        setError('');
        setUploadedAudioID(response.audioID);
        dispatch(setUnsavedChanges(false));
        if (editPerm) {
          navigateOG(`/audio/edit/${response.audioID}`);
        } else {
          navigateOG(`/audio/view/${response.audioID}`);
        }
      })
      .catch(error => {
        setIsLoading(false);
        console.error("Upload error:", error);
        setSuccessMessage('');
        setError(error || 'Failed to upload audio.');
      });
  };

  const isFormValid = record.title && file && record.copyrightCert && record.tags?.length > 0 && Object.values(record.classification).includes(true);
  const Required = () => <span className="required">*</span>;

  const renderBreadcrumbs = () => {
    return (
      <div className="breadcrumb-box">
        <ul className="breadcrumb">
          <li className="link"><SafeLink to="/audio/list">List</SafeLink></li>
        </ul>
      </div>
    );
  };

  if (isLoading) {
    return (<Waiting message="Please wait, uploading..." />);
  }

  return (
    <div className="edit-wrapper">
      <div className="display-box-wrapper">
        <div className="display-box">
          <form onSubmit={handleSubmit}>
            <h2 className='title'>Upload Audio</h2>
            {renderBreadcrumbs()}

            <div className="form-group">
              <div className="form-group-with-image">
                <div className="form-fields">
                  <label className="form-label" htmlFor="file">Audio File: <Required /></label>
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleFileDrop}
                  >
                    <input className="form-upload" type="file" id="file" ref={fileInputRef} onChange={handleFileChange} />
                  </div>
                  <p className="form-note">{fieldNotes.filetypes}</p>

                  <label className="form-label" htmlFor="title">Title: <Required /></label>
                  <input name="title" className="form-field" type="text" id="title" value={record.title || ''} onChange={handleChange} />

                  <label className="form-label" htmlFor="status">Status: <Required /></label>
                  <select name="status" value={record.status} onChange={handleChange} className="form-select">
                    <option value="Review">Under Review</option>
                    <option value="Approved" disabled={!editPerm}>Approved</option>
                    <option value="Disapproved" disabled={!editPerm}>Disapproved</option>
                    <option value="Trashed" disabled={!editPerm}>Trashed</option>
                  </select>
                  <p className="form-note mt-1">{fieldNotes.status}</p>
                </div>

                <div
                  className="cover-image-panel"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files[0] || null;
                    if (!f) return;
                    setCoverImageFile(f);
                    setCoverImagePreview(URL.createObjectURL(f));
                  }}
                >
                  {coverImagePreview ? (
                    <img className="cover-image" src={coverImagePreview} alt="Cover preview"
                      onDragOver={(e) => e.preventDefault()} />
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
                        const f = e.target.files[0] || null;
                        setCoverImageFile(f);
                        setCoverImagePreview(f ? URL.createObjectURL(f) : null);
                      }}
                    />
                    <label htmlFor="coverImageInput" className="cover-image-upload-btn">
                      Choose Image
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="title">Classification: <Required /></label>
              <ClassificationCheckboxes
                classification={record.classification}
                handleChange={handleChange}
              />
              <p className="form-note">{fieldNotes.classification}</p>

              <label className="form-label" htmlFor="tags">Tags: <Required /></label>
              <TagInput
                initialTags={record.tags}
                onTagChange={handleTagChange}
              />
              <p className="form-note mt-1">{fieldNotes.tags}</p>

              <label className="form-label" htmlFor="comments">Comments:</label>
              <textarea className="form-textarea" id="comments" name="comments" value={record.comments || ''} onChange={handleChange}></textarea>

              <div className='checkbox-wrapper'>
                <input 
                  type="checkbox" 
                  id="copyrightCert" 
                  name="copyrightCert" 
                  checked={record.copyrightCert === true} 
                  onChange={handleChange} 
                />
                <label htmlFor="copyrightCert"> {fieldNotes.copyright} <Required /></label>
              </div>

            </div>
            
            <div className='button-box'>
              <button className='button cancel' type="button" onClick={() => navigate(`/audio/upload`)}>Cancel</button>
              <button className='button submit' type="submit" disabled={!isFormValid}>Upload</button>
            </div>
            {uploadedAudioID && (
              <div className="edit-box">
                <Link to={`/audio/edit/${uploadedAudioID}`} className="edit-button">
                  Edit
                </Link>
              </div>
            )}
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

// Helper functions

export default AudioUpload;
