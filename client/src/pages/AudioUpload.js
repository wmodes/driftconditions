// AudioUpload.js - A page for uploading audio files

import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { audioUpload } from '../store/audioSlice';
import { formatTagsForDisplay, formatTagStrForDB } from '../utils/formatUtils';

// Import the config object from the config.js file
const config = require('../config/config'); 
// pull variables from the config object
const allowedFileTypes = config.audio.allowedFileTypes;
const classificationOptions = config.audio.classification;
const fieldNotes = config.audio.fieldNotes;

function AudioUpload() {
  // Local state for managing form inputs
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [comments, setComments] = useState('');
  const [file, setFile] = useState(null);
  const [isCertified, setIsCertified] = useState(false);
  const [uploadedAudioID, setUploadedAudioID] = useState(null);

  const dispatch = useDispatch();  

  // Success and error handling
  const [successMessage, setSuccessMessage] = useState(''); // New state for success message
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

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
  
    if (selectedFile && allowedFileTypes.includes(selectedFile.type)) {
      // Set the file if it's one of the allowed types
      setFile(selectedFile);
      setError(''); // Clear any previous error message
    } else {
      // Clear the file input and show an error if the file type is not allowed
      e.target.value = ''; // Clears the file input
      // Display an error message to the user
      console.error("Invalid file type:", selectedFile?.type);
      setError('Invalid file type. Please select a valid audio file.');
    }
  };

  const submitHandler = e => {
    e.preventDefault();

    // Prep fields before submitting
    const updatedRecord = {
      ...audioRecord,
      tags: formatTagStrForDB(audioRecord.tags),
      classification: Object.keys(audioRecord.classification).filter(key => audioRecord.classification[key])
    };
  
    dispatch(audioUpload(updatedRecord))
      .unwrap()
      .then(response => {
        setSuccessMessage('Upload successful!');
        setError('');
        setUploadedAudioID(response.audioID);
        // Update audioDetails state with normalized tags to reflect in the input field
        setAudioRecord(prevDetails => ({
          ...prevDetails,
          // Convert array back to string for input field
          tags: formatTagsForDisplay(updatedRecord.tags) 
        }));
      })
      .catch(error => {
        console.error("Upload error:", error);
        setError(error.message || 'Failed to upload audio.');
      });
  };  

  // Check if required fields are filled
  const isFormValid = title && file && isCertified;
  const Required = () => <span className="required">*</span>;

  const prepLabel = (text) => text
  .replace(/([A-Z])/g, ' $1')
  .replace(/^./, match => match.toUpperCase())
  .trim();

  return (
    <div className="upload-wrapper">
      <div className="display-box-wrapper">
        <div className="display-box">
          <form onSubmit={submitHandler}>
            <h2 className='title'>Upload Audio</h2>

            <label className="form-label" htmlFor="title">Title: <Required /></label>
            <input className="form-field" type="text" id="title" value={title} onChange={e => setTitle(e.target.value)} />

            <label className="form-label" htmlFor="title">Type:</label>
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
            <input className="form-field" type="text" id="tags" value={tags} onChange={e => setTags(e.target.value)} />
              <p className="form-note">{fieldNotes.tags}</p>
            
            <label className="form-label" htmlFor="comments">Comments:</label>
            <textarea className="form-textarea" id="comments" value={comments} onChange={e => setComments(e.target.value)}></textarea>
            
            <label className="form-label" htmlFor="file">Audio File: <Required /></label>
            <input className="form-upload" type="file" id="file" onChange={handleFileChange} />
            <p className="form-note">Supported file types: mp3, wav, ogg, flac</p>
            
            <div className='checkbox-wrapper'>
              <input type="checkbox" id="copyright_cert" checked={isCertified} onChange={e => setIsCertified(e.target.checked)} />
              <label htmlFor="copyright_cert"> Please certify that this contains no copyrighted works for which you do not hold the copyright. <Required /></label>
            </div>
            
            <div className='button-box'>
              <button className='button submit' type="submit" disabled={!isFormValid || uploadedAudioID}>Upload</button>
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
        </div>
      </div>
    </div>
  );
}

export default AudioUpload;
