// AudioUpload.js - A page for uploading audio files

import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { audioUpload } from '../store/audioSlice';
import Waiting from '../utils/appUtils';

import { setClassificationFormOptions, formatClassificationForDB } from '../utils/formatUtils';
import { ClassificationCheckboxes, TagInput } from '../utils/formUtils';

// unsavedChanges: global state, listeners, and handlers
import { setUnsavedChanges } from '../store/formSlice';
import { useUnsavedChangesEvents, SafeLink, useSafeNavigate } from '../utils/formUtils';

// Import the config object from the config.js file
import config from '../config/config'; 
// pull variables from the config object
const allowedFileTypes = config.audio.allowedFileTypes;
const classificationOptions = config.audio.classification;
const fieldNotes = config.audio.fieldNotes;

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
    // Check if the user has permission to edit audio
    if (userAuth.permissions.indexOf('audioEdit') !== -1) {
      // console.log('User has permission to edit audio');
      setEditPerm(true);
    }
  }, [userAuth.permissions]);

  // Local state for managing form inputs
  // const [title, setTitle] = useState('');
  // const [tags, setTags] = useState('');
  // const [comments, setComments] = useState('');
  const [file, setFile] = useState(null);
  // const [isCertified, setIsCertified] = useState(false);
  const [uploadedAudioID, setUploadedAudioID] = useState(null);

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
  });
  
  const handleChange = (e) => {
    dispatch(setUnsavedChanges(true));
    // console.log('AudioUpload:handleChange: setting unsavedChanges to true');
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      if (name === 'copyrightCert') {
        // Specifically handle the copyrightCert checkbox
        setRecord(prevState => ({
          ...prevState,
          [name]: checked // Directly set copyrightCert based on checked value
        }));
      } else {
        // Handle classification checkbox change
        // Assuming this part remains as it's specifically for handling multiple classification checkboxes
        setRecord(prevState => ({
          ...prevState,
          classification: { ...prevState.classification, [name]: checked }
        }));
      }
    } else {
      // Handle changes for inputs other than checkboxes
      setRecord(prevState => ({ ...prevState, [name]: value }));
    }
  };

  const generateAndSetTitle = (file) => {
    if (!record.title) {
      // Generate a title based on the file name
      const fileName = file.name;
      let title = fileName.replace(/\.[^/.]+$/, ''); // Remove file extension
      // Replace punctuation characters with a single space, excluding space-dash-space pattern, single quotes, and Unicode characters
      title = title.replace(/(?<![ -'])\p{P}+(?![ -'])/gu, ' ');
      // Make Title Case
      title = title.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
      setRecord(prevState => ({ ...prevState, title }));
    }
  };

  const handleFileChange = (e) => {
    dispatch(setUnsavedChanges(true));
    // console.log('AudioUpload:handleFileChange: setting unsavedChanges to true');
    const selectedFile = e.target.files[0];    
    if (selectedFile && allowedFileTypes.includes(selectedFile.type)) {
      // Set the file if it's one of the allowed types
      setFile(selectedFile);
      generateAndSetTitle(selectedFile);
      setError(''); // Clear any previous error message
    } else {
      // Clear the file input and show an error if the file type is not allowed
      e.target.value = ''; // Clears the file input
      // Display an error message to the user
      console.error("Invalid file type:", selectedFile?.type);
      setError('Invalid file type. Please select a valid audio file.');
    }
  };

  const handleTagChange = (newTags) => {
    dispatch(setUnsavedChanges(true));
    // console.log('AudioUpload:handleTagChange: setting unsavedChanges to true');
    setRecord(prevState => ({ ...prevState, tags:newTags }));
  };

  const handleSubmit = e => {
    e.preventDefault();
    setIsLoading(true); // Start loading
    // Prep fields before submitting
    const adjustedRecord = {
      ...record,
      classification: formatClassificationForDB(record.classification),
      copyrightCert: record.copyrightCert ? 1 : 0
    };
    dispatch(audioUpload({audioRecord: adjustedRecord, file: file}))
      .unwrap()
      .then(response => {
        setIsLoading(false); // Stop loading
        setSuccessMessage('Upload successful!');
        setError('');
        setUploadedAudioID(response.audioID);
        dispatch(setUnsavedChanges(false));
        // Redirect to the edit page for the newly uploaded audio
        navigateOG(`/audio/edit/${response.audioID}`);
      })
      .catch(error => {
        setIsLoading(false); // Stop loading
        console.error("Upload error:", error);
        setError(error.message || 'Failed to upload audio.');
      });
  };

  // Check if required fields are filled
  const isFormValid = record.title && file && record.copyrightCert;
  const Required = () => <span className="required">*</span>;

  // const prepLabel = (text) => text
  // .replace(/([A-Z])/g, ' $1')
  // .replace(/^./, match => match.toUpperCase())
  // .trim();

  // Function to render advanced pagination buttons with navigation controls
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
    return (<Waiting />);
  }

  return (
    <div className="edit-wrapper">
      <div className="display-box-wrapper">
        <div className="display-box">
          <form onSubmit={handleSubmit}>
            <h2 className='title'>Upload Audio</h2>
            {renderBreadcrumbs()}
            <div className="form-group">
              <label className="form-label" htmlFor="title">Title: <Required /></label>
              <input name="title" className="form-field" type="text" id="title" value={record.title} onChange={handleChange} />

              <label className="form-label" htmlFor="status">Status:</label>
              <select name="status" value={record.status} onChange={handleChange} className="form-select">
                <option value="Review">Under Review</option>
                <option value="Approved" disabled={!editPerm}>Approved</option>
                <option value="Disapproved" disabled={!editPerm}>Disapproved</option>
                <option value="Trashed" disabled={!editPerm}>Trashed</option>
              </select>
              <p className="form-note mt-1">{fieldNotes.status}</p>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="file">Audio File: <Required /></label>
              <input className="form-upload" type="file" id="file" onChange={handleFileChange} />
              <p className="form-note">{fieldNotes.filetypes}</p>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="title">Classification:</label>
              <ClassificationCheckboxes
                classification={record.classification}
                handleChange={handleChange}
              />
              <p className="form-note">{fieldNotes.classification}</p>

              <label className="form-label" htmlFor="tags">Tags:</label>
              {/* <input className="form-field" type="text" id="tags" name="tags" value={record.tags || ''} onChange={handleChange} /> */}      
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

export default AudioUpload;
