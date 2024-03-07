// AudioEdit.js - Edit audio details

// TODO: Modify URL to show audioID

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { audioInfo, audioUpdate } from '../store/audioSlice';
import { formatDateForDB, formatDateForDisplay, formatTagsForDB, formatTagsForDisplay } from '../utils/dataUtils';

function AudioEdit() {
  const { audioID } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

  // Success and error handling
  const [successMessage, setSuccessMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [error, setError] = useState('');

  // State for managing form inputs
  const [audioDetails, setAudioDetails] = useState({
    title: '',
    filename: '', // Assuming this is not editable but we're showing it
    status: '',
    classification: {
      ambient: false,
      background: false,
      foreground: false,
      spoken: false,
      music: false,
      soundEffects: false,
      other: false,
    },
    tags: '',
    comments: '',
    // Non-editable details
    uploader_id: '',
    upload_date: '',
    duration: '',
    file_type: '',
    copyright_cert: 0,
  });

  useEffect(() => {
    if (!audioID) return;
    dispatch(audioInfo(audioID))
      .unwrap()
      .then(response => {
        // Parse and transform the response as needed, similar to how it's done in UploadAudio
        setAudioDetails(prevState => ({
          ...prevState,
          ...response,
          tags: formatTagsForDisplay(response.tags),
          upload_date: formatDateForDisplay(response.upload_date),
          classification: response.classification.reduce((acc, curr) => ({
            ...acc,
            [curr]: true
          }), {...audioDetails.classification})
        }));
      })
      .catch(err => {
        console.error('Error fetching audio details:', err);
        setFormError('Failed to fetch audio details.');
      });
  }, [audioID, dispatch]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      // Handle classification checkbox change
      setAudioDetails(prevState => ({
        ...prevState,
        classification: { ...prevState.classification, [name]: checked }
      }));
    } else {
      setAudioDetails(prevState => ({ ...prevState, [name]: value }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Normalize tags before submitting
    const normalizedTags = formatTagsForDB(audioDetails.tags);

    const updatedDetails = {
      ...audioDetails,
      tags: normalizedTags,
      classification: Object.keys(audioDetails.classification).filter(key => audioDetails.classification[key])
    };

    dispatch(audioUpdate({audioID, ...updatedDetails}))
      .unwrap()
      .then(() => {
        setSuccessMessage('Update successful!');
        // Update audioDetails state with normalized tags to reflect in the input field
        setAudioDetails(prevDetails => ({
          ...prevDetails,
          // Convert array back to string for input field
          tags: formatTagsForDisplay(normalizedTags) 
        }));
      })
      .catch(err => {
        console.error('Update error:', err);
        setFormError('Failed to update audio.');
      });
  };

  // Redirect to signin page if not authenticated
  if (isAuthenticated === false) {
    return <Navigate to='/signin' replace={true} />;
  }

  const Required = () => <span className="required">*</span>;

  const prepLabel = (text) => text
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, match => match.toUpperCase())
    .trim();

  return (
    <div className="edit-wrapper">
      <div className="display-box-wrapper">
        <div className="display-box">
          <form onSubmit={handleSubmit}>
            <h2 className='title'>Edit Audio</h2>
            <div className="form-group">
              <label className="form-label" htmlFor="title">Title: <Required /></label>
              <input className="form-field" type="text" id="title" name="title" value={audioDetails.title} onChange={handleChange} />
              
              <div className="mb-2">
                <label className="form-label">Filename: <span className="non-editable">{audioDetails.filename}</span></label>
              </div>

              <label className="form-label" htmlFor="status">Status:</label>
              <select name="status" value={audioDetails.status} onChange={handleChange} className="form-select">
                <option value="Review">Under Review</option>
                <option value="Approved">Approved</option>
                <option value="Disapproved">Disapproved</option>
                <option value="Trashed">Trashed</option>
              </select>
            </div>

            <div className="form-group">
              Editing elements here.
            </div>

            <div className="form-group">
              <div className="form-checkbox">
                {Object.entries(audioDetails.classification).map(([key, value]) => (
                  <div key={key}>
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

              <label className="form-label" htmlFor="tags">Tags:</label>
              <input className="form-field" type="text" id="tags" name="tags" value={audioDetails.tags} onChange={handleChange} />
              <p className="form-note">Separated with commas</p>

              <label className="form-label" htmlFor="comments">Comments:</label>
              <textarea className="form-textarea" id="comments" name="comments" value={audioDetails.comments} onChange={handleChange}></textarea>
            </div>

            <div className='button-box'>
              <button className='button cancel' type="button" onClick={() => navigate('/audio-list')}>Cancel</button>
              <button className='button submit' type="submit">Save Changes</button>
            </div>

            <div className='message-box'>
              {successMessage && <p className="success">{successMessage}</p>}
              {formError && <p className="error">{formError}</p>}
              {error && <p className="error">{error}</p>}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AudioEdit;
