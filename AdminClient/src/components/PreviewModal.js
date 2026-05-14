// PreviewModal.js — three-phase modal for recipe preview
//   Phase 1 (warn):       explain wait time, offer Confirm/Cancel
//   Phase 2 (generating): spinner while MixEngine renders
//   Phase 3 (ready):      native audio player with scrubbing + track list

import React, { useState, useRef } from 'react';
import { tailChase } from 'ldrs';
import config from '../config/config';

tailChase.register();

const adminServerBaseURL = config.adminServer.baseURL;

const PHASE = { WARN: 'warn', GENERATING: 'generating', READY: 'ready' };

const PreviewModal = ({ recipeData, title, onClose }) => {
  const [phase, setPhase] = useState(PHASE.WARN);
  const [audioURL, setAudioURL] = useState(null);
  const [playlist, setPlaylist] = useState([]);
  const [error, setError] = useState(null);
  const audioRef = useRef(null);

  const handleConfirm = async () => {
    setPhase(PHASE.GENERATING);
    setError(null);
    try {
      const res = await fetch(`${adminServerBaseURL}/api/recipe/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ recipeData, title }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Preview generation failed');
      }
      setAudioURL(`${adminServerBaseURL}${data.url}`);
      setPlaylist(data.playlist || []);
      setPhase(PHASE.READY);
    } catch (err) {
      setError(err.message);
      setPhase(PHASE.WARN);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box">
        <button className="modal-close" onClick={onClose}>✕</button>

        {phase === PHASE.WARN && (
          <>
            <h3>Preview Recipe</h3>
            <p>Generating a preview mix takes <strong>30–90 seconds</strong> depending on clip lengths.</p>
            {error && <p className="modal-error">{error}</p>}
            <div className="modal-actions">
              <button className="button submit" onClick={handleConfirm}>Generate Preview</button>
              <button className="button" onClick={onClose}>Cancel</button>
            </div>
          </>
        )}

        {phase === PHASE.GENERATING && (
          <div className="modal-generating">
            <l-tail-chase size="60" speed="1.75" color="#336699" />
            <p>Generating preview mix…</p>
            <p className="modal-hint">This may take up to 90 seconds.</p>
          </div>
        )}

        {phase === PHASE.READY && (
          <>
            <h3>Preview Ready</h3>
            <audio
              ref={audioRef}
              controls
              autoPlay
              src={audioURL}
              className="modal-audio"
            />
            {playlist.length > 0 && (
              <ul className="modal-playlist">
                {playlist.map((clip, i) => (
                  <li key={i}>{clip.title}</li>
                ))}
              </ul>
            )}
            <div className="modal-actions">
              <button className="button submit" onClick={handleConfirm}>Regenerate</button>
              <button className="button" onClick={onClose}>Close</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PreviewModal;
