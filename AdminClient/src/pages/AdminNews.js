// AdminNews - page for admins/mods to post news items included in contributor digests

import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { adminNewsList, adminNewsCreate } from '../store/adminSlice';
import { formatDateAsFriendlyDate } from '../utils/formatUtils';

function AdminNews() {
  const dispatch = useDispatch();
  const [news, setNews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [content, setContent] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  // trigger re-fetch after a successful post
  const [updateTrigger, setUpdateTrigger] = useState(false);

  useEffect(() => {
    dispatch(adminNewsList())
      .unwrap()
      .then(response => {
        setNews(response.news);
        setIsLoading(false);
        setError('');
      })
      .catch(err => {
        setError(err || 'Failed to fetch news items.');
        setIsLoading(false);
      });
  }, [dispatch, updateTrigger]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    setError('');
    await dispatch(adminNewsCreate({ content }))
      .unwrap()
      .then(() => {
        setSuccessMessage('News item posted.');
        setContent('');
        setUpdateTrigger(t => !t);
      })
      .catch(err => {
        setError(err || 'Failed to post news item.');
      });
  };

  return (
    <div className="edit-wrapper">
      <div className="display-box-wrapper">
        <div className="display-box">
          <h2 className='title'>Admin News</h2>

          <div className='message-box'>
            {isLoading && <p className="success">Loading...</p>}
            {successMessage && <p className="success">{successMessage}</p>}
            {error && <p className="error">{error}</p>}
          </div>

          {/* Queued items — shown first, matching digest order */}
          <div className="form-group">
            <label className="form-label">Queued for Next Digest:</label>
            {!isLoading && news.length === 0 && (
              <p className="form-note" style={{ marginTop: '0.5rem' }}>No pending news items.</p>
            )}
            {!isLoading && news.length > 0 && (
              <ul className="news-list">
                {news.map(item => (
                  <li key={item.commID}>
                    {item.content}{' '}
                    <span className="news-contrib">
                      ({formatDateAsFriendlyDate(item.createdAt)} by {item.username})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Compose new item */}
          <div className="form-group">
            <form onSubmit={handleSubmit}>
              <label className="form-label" htmlFor="content">Post a news update:</label>
              <textarea
                className="form-textarea"
                id="content"
                name="content"
                rows={4}
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="What should contributors know this month?"
              />
              <p className="form-note">These items appear in contributor digests until the next monthly run, at which point they are archived. Be careful as there is no facility for deleting them except messing with the database directly.</p>
              <div className="button-box">
                <button
                  className="button submit"
                  type="submit"
                  disabled={!content.trim()}
                >
                  Post Update
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}

export default AdminNews;
