

import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
// Assuming there's an action defined to handle audio uploads in your Redux store
import { uploadAudio } from '../store/audioSlice';

function UploadAudio() {
  // Local state for managing form inputs
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [comments, setComments] = useState('');
  const [file, setFile] = useState(null);
  const [isCertified, setIsCertified] = useState(false);

  // Accessing the authentication state to check if the user is logged in
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const dispatch = useDispatch();  
  // Add this state to store errors
  const error = useSelector((state) => state.auth.error);
  // const [formError, setFormError] = useState('');

  // Local state for managing classification checkboxes
  const [classification, setClassification] = useState({
    ambient: false,
    background: false,
    foreground: false,
    spoken: false,
    music: false,
    soundEffects: false,
    other: false,
  });
  // Handle classification checkbox change
  const handleClassificationChange = (e) => {
    const { name, checked } = e.target;
    setClassification(prev => ({ ...prev, [name]: checked }));
  };

  const submitHandler = e => {
    e.preventDefault();
    // Convert tags from string to array
    const tagsArray = tags.split(',').map(tag => tag.trim());
    // Create a FormData object to submit the file and other form data
    const formData = new FormData();
    formData.append('title', title);
    formData.append('tags', JSON.stringify(tagsArray));
    formData.append('comments', comments);
    formData.append('file', file);
    formData.append('copyright_cert', isCertified ? 1 : 0);

    dispatch(uploadAudio(formData))
      .unwrap()
      .then(() => {
        // Reset form or handle success
      })
      .catch(error => {
        // Handle any error here
        console.error("Upload error:", error);
      });
  };

  // Redirect to signin page if not authenticated
  if (isAuthenticated === false) {
    return <Navigate to='/signin' replace={true} />;
  }

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
            <label className="form-label" htmlFor="title">Category:</label>
            <div className="form-checkbox">
              {Object.entries(classification).map(([key, value]) => (
                <div key={key}>
                  <input
                    type="checkbox"
                    id={key}
                    name={key}
                    checked={value}
                    onChange={handleClassificationChange}
                  />
                  <label htmlFor={key}> {prepLabel(key)}</label>
                </div>
              ))}
            </div>            
            <label className="form-label" htmlFor="tags">Tags:</label>
            <input className="form-field" type="text" id="tags" value={tags} onChange={e => setTags(e.target.value)} />
            <p className="form-note">Separated with commas</p>
            
            <label className="form-label" htmlFor="comments">Comments:</label>
            <textarea className="form-textarea" id="comments" value={comments} onChange={e => setComments(e.target.value)}></textarea>
            
            <label className="form-label" htmlFor="file">Audio File: <Required /></label>
            <input className="form-upload" type="file" id="file" onChange={e => setFile(e.target.files[0])} />
            <p className="form-note">Supported file types: mp3, wav, ogg, flac</p>
            
            <div className='checkbox-wrapper'>
              <input type="checkbox" id="copyright_cert" checked={isCertified} onChange={e => setIsCertified(e.target.checked)} />
              <label htmlFor="copyright_cert"> Please certify that this contains no copyrighted works for which you do not hold the copyright. <Required /></label>
            </div>
            
            <div className='button-box'>
              <button className='button submit' type="submit" disabled={!isFormValid}>Upload</button>
            </div>
            <div class='error-box'>
              {error && <p class="error">{error}</p>}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default UploadAudio;
