/**
 * @file AudioBatchUpload.js - A page for uploading multiple audio files with the same attributes
 */

import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { audioUpload } from '../store/audioSlice';
import Waiting from '../utils/appUtils';
import { zoomies } from 'ldrs';

import { setClassificationFormOptions, formatClassificationForDB } from '../utils/formatUtils';
import { ClassificationCheckboxes, TagInput } from '../utils/formUtils';

// unsavedChanges: global state, listeners, and handlers
import { setUnsavedChanges } from '../store/formSlice';
import { useUnsavedChangesEvents, SafeLink, useSafeNavigate } from '../utils/formUtils';

// Import the config object from the config.js file
import config from '../config/config'; 
const allowedFileTypes = config.audio.allowedFileTypes;
const classificationOptions = config.audio.classification;
const classificationFields = config.audio.classificationFields;
const fieldNotes = config.audio.fieldNotes;

// Register the loading ring component
zoomies.register();

function AudioBatchUpload() {
  const dispatch = useDispatch();  
  const navigateOG = useNavigate();
  const navigate = useSafeNavigate();

  // Call the useUnsavedChanges hook to track unsaved changes and handle navigation
  useUnsavedChangesEvents();

  // get auth state from Redux store
  const { user: userAuth } = useSelector((state) => state.auth);
  const [editPerm, setEditPerm] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Check if the user has permission to edit audio
  useEffect(() => {
    if (userAuth.permissions.indexOf('audioEdit') !== -1) {
      setEditPerm(true);
    }
  }, [userAuth.permissions]);

  // Local state for managing form inputs
  const [files, setFiles] = useState([]);
  const [uploadStatus, setUploadStatus] = useState([]); // Track the upload status of each file

  // Success and error handling
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  // State for managing form inputs
  const [record, setRecord] = useState({
    status: 'Review',
    classification: setClassificationFormOptions(classificationOptions, false),
    copyrightCert: 0,
  });

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

  const handleFileChange = (e) => {
    dispatch(setUnsavedChanges(true));
    const selectedFiles = Array.from(e.target.files);
    setFiles(prevFiles => [...prevFiles, ...selectedFiles]);
    setUploadStatus(prevStatus => [
      ...prevStatus,
      ...selectedFiles.map(() => ({ status: 'Pending', error: null, uploaded: false }))
    ]);
    setError(''); // Clear any previous error message
  };

  const handleTagChange = (newTags) => {
    dispatch(setUnsavedChanges(true));
    setRecord(prevState => ({ ...prevState, tags: newTags }));
  };

  /**
   * Helper function to create an array of objects containing file information.
   * @returns {Array<Object>} - Array of objects containing file information.
   */
  const prepareBatchFiles = () => {
    return files.map((file, index) => ({
      file,
      title: generateTitle(file),
      uploaded: uploadStatus[index] ? uploadStatus[index].uploaded : false
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(false);

    const batchFiles = prepareBatchFiles();
    const uploadResults = [];

    for (const [index, { file, title, uploaded }] of batchFiles.entries()) {
      // Skip files that have already been uploaded
      if (uploaded) {
        continue;
      }

      // Set the status to uploading
      setUploadStatus(prevStatus => {
        const newStatus = [...prevStatus];
        newStatus[index] = { status: 'Uploading', error: null, uploaded: false };
        return newStatus;
      });

      const adjustedRecord = {
        ...record,
        title,
        classification: formatClassificationForDB(record.classification),
        copyrightCert: record.copyrightCert ? 1 : 0
      };

      try {
        const response = await dispatch(audioUpload({ audioRecord: adjustedRecord, file })).unwrap();
        uploadResults.push({ success: true });
        setUploadStatus(prevStatus => {
          const newStatus = [...prevStatus];
          newStatus[index] = { status: 'Uploaded', error: null, uploaded: true };
          return newStatus;
        });
        setSuccessMessage(`Upload successful for ${file.name}!`);
        setError('');

      } catch (error) {
        console.error("Upload error:", error);
        uploadResults.push({ success: false });
        setUploadStatus(prevStatus => {
          const newStatus = [...prevStatus];
          newStatus[index] = { status: 'Error', error: error.message || `Failed to upload ${file.name}.`, uploaded: false };
          return newStatus;
        });
        setError(error.message || `Failed to upload ${file.name}.`);
      }
    }

    // Determine final success or error message
    const totalSuccess = uploadResults.filter(result => result.success).length;
    const totalFailure = uploadResults.filter(result => !result.success).length;

    if (totalSuccess > 0 && totalFailure > 0) {
      setError('Some upload errors');
      setSuccessMessage('');
    } else if (totalFailure > 0) {
      setError('Upload error');
      setSuccessMessage('');
    } else {
      setError('');
      setSuccessMessage('Uploads successful');
      setIsSubmitted(true);
      dispatch(setUnsavedChanges(false));
    }
  };

  const isSubmitReady = files.length > 0 && record.copyrightCert && record.classification && record.tags && Object.values(record.classification).includes(true) && !isSubmitted;

  /**
   * Render the progress of each file upload.
   * @returns {JSX.Element} - JSX element displaying the upload progress.
   */
  const renderUploadProgress = () => {
    const batchFiles = prepareBatchFiles();

    if (!batchFiles.length) {
      return <p>No files selected</p>;
    }

    return (
      <div className="upload-progress">
        {batchFiles.map((batchFile, index) => (
          <div key={index} className="file-progress">
            <span className="file-name">{batchFile.title}</span>
            <span className="file-status">
              {uploadStatus[index] && uploadStatus[index].status === 'Uploaded' ? (
                <span className="uploaded">Uploaded</span>
              ) : uploadStatus[index] && uploadStatus[index].status === 'Error' ? (
                <span className="error">{uploadStatus[index].error}</span>
              ) : uploadStatus[index] && uploadStatus[index].status === 'Uploading' ? (
                <span className="uploading"><l-zoomies color="#336699"></l-zoomies></span>
              ) : (
                <span className="pending">Pending</span>
              )}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const Required = () => <span className="required">*</span>;

  const renderBreadcrumbs = () => {
    return (
      <div className="breadcrumb-box">
        <ul className="breadcrumb">
          <li className="link"><SafeLink to="/audio/list">List</SafeLink></li>
          <li className="link"><SafeLink to="/audio/upload/batch">Batch Upload</SafeLink></li>
        </ul>
      </div>
    );
  };

  return (
    <div className="edit-wrapper">
      <div className="display-box-wrapper">
        <div className="display-box">
          <form onSubmit={handleSubmit}>
            <h2 className='title'>Upload Batch Audio</h2>
            {renderBreadcrumbs()}

            <div className="form-group">
              <label className="form-label" htmlFor="file">Audio Files: <Required /></label>
              <input className="form-upload" type="file" id="file" onChange={handleFileChange} multiple />
              <p className="form-note">{fieldNotes.filetypes}</p>
            </div>

            <div className="form-group">
              <label className="form-label">Upload Status:</label>
              {renderUploadProgress()}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="status">Status: <Required /></label>
              <select name="status" value={record.status} onChange={handleChange} className="form-select">
                <option value="Review">Under Review</option>
                <option value="Approved" disabled={!editPerm}>Approved</option>
                <option value="Disapproved" disabled={!editPerm}>Disapproved</option>
                <option value="Trashed" disabled={!editPerm}>Trashed</option>
              </select>
              <p className="form-note mt-1">{fieldNotes.status}</p>
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
                initialRecord={record.tags}
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
              <button className='button submit' type="submit" disabled={!isSubmitReady}>Upload</button>
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

// Helper functions

/**
 * Generate a title based on the file name.
 * @param {File} file - The file object.
 * @returns {string} - The generated title.
 */
const generateTitle = (file) => {
  // Generate a title based on the file name
  const fileName = file.name;
  let title = fileName.replace(/\.[^/.]+$/, ''); // Remove file extension
  // Replace underscores with spaces
  title = title.replace(/_/g, ' ');
  // Replace punctuation characters with a single space, excluding apostrophes and dashes within words
  title = title.replace(/[^\w\s'-]+/g, ' ');
  // Make Title Case
  title = title.replace(/\w\S*/g, function(txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
  return title;
};

export default AudioBatchUpload;
