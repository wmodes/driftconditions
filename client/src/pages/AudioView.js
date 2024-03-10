// AudioView - View details of an audio file

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { audioInfo } from '../store/audioSlice';
import { formatDateForDisplay, formatListForDisplay } from '../utils/formatUtils';
import FeatherIcon from 'feather-icons-react';

function AudioView() {
  const { audioID } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

  const [error, setError] = useState('');

  const [audioDetails, setAudioDetails] = useState({
    title: '',
    filename: '',
    status: '',
    classification: '',
    tags: '',
    comments: '',
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
        setAudioDetails({
          ...response,
          classification: formatListForDisplay(response.classification),
          tags: formatListForDisplay(response.tags),
          upload_date: formatDateForDisplay(response.upload_date),
        });
      })
      .catch(err => {
        console.error('Error fetching audio details:', err);
        setError('Failed to fetch audio details.');
      });
  }, [audioID, dispatch]);

  // Redirect to signin page if not authenticated
  if (isAuthenticated === false) {
    return <Navigate to='/signin' replace={true} />;
  }

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
    <div className="edit-wrapper">
      <div className="display-box-wrapper">
        <div className="display-box">
          <h2 className='title'>View Audio Details</h2>
          <div className="form-group">
            <div className="form-row">
              <span className="form-label">Title:</span>
              <span className="form-value">{audioDetails.title}</span>
            </div>
            <div className="form-row">
              <span className="form-label">Filename:</span>
              <span className="form-value">{audioDetails.filename}</span>
            </div>
            <div className="form-row">
              <span className="form-label">Status:</span>
              <span className="form-value">{audioDetails.status}</span>
            </div>
          </div>

          <div className="form-group">
            Listener here.
          </div>
  
          <div className="form-group">
            <div className="form-col">
              <div className="form-label">Classification:</div>
              <div className="form-value">
                {audioDetails.classification}
              </div>
            </div>
            <div className="form-col">
              <div className="form-label">Tags:</div>
              <div className="form-value">{audioDetails.tags}</div>
            </div>
            <div className="form-col">
              <div className="form-label">Comments:</div>
              <div className="form-value">{audioDetails.comments}</div>
            </div>
          </div>

          <div className='message-box'>
            {error && <p className="error">{error}</p>}
          </div>
  
          {renderBreadcrumbs()}
        </div>
      </div>
    </div>
  );  
}

export default AudioView;
