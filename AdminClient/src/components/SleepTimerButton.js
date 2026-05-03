// SleepTimerButton.js — moon icon + sleep timer dropdown

import React, { useState, useEffect, useRef } from 'react';
import FeatherIcon from 'feather-icons-react';

const OPTIONS = [
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '60 min', minutes: 60 },
];

const SleepTimerButton = ({ sleepTimerEnd, setSleepTimerEnd, isPlaying, onPlay }) => {
  const [open, setOpen] = useState(false);
  const [remaining, setRemaining] = useState(null);
  const wrapperRef = useRef(null);

  const isActive = sleepTimerEnd !== null;

  // update remaining time display every second while active
  useEffect(() => {
    if (!isActive) { setRemaining(null); return; }
    const tick = () => {
      const secs = Math.max(0, Math.round((sleepTimerEnd - Date.now()) / 1000));
      setRemaining(secs);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [sleepTimerEnd, isActive]);

  // close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const setTimer = (minutes) => {
    setSleepTimerEnd(Date.now() + minutes * 60 * 1000);
    if (!isPlaying && onPlay) onPlay();
    setOpen(false);
  };

  const cancelTimer = () => {
    setSleepTimerEnd(null);
    setOpen(false);
  };

  const formatRemaining = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className={`sleep-timer-wrapper ${isActive ? 'active' : ''}`} ref={wrapperRef}>
      <button
        className="sleep-btn"
        title={isActive ? `Sleep timer: ${formatRemaining(remaining ?? 0)}` : 'Sleep timer'}
        onClick={() => setOpen(o => !o)}
      >
        <FeatherIcon icon="moon" />
        {isActive && remaining !== null && (
          <span className="sleep-remaining">{formatRemaining(remaining)}</span>
        )}
      </button>
      {open && (
        <div className="sleep-dropdown">
          {OPTIONS.map(({ label, minutes }) => (
            <button key={minutes} onClick={() => setTimer(minutes)}>{label}</button>
          ))}
          {isActive && (
            <button className="cancel" onClick={cancelTimer}>Cancel</button>
          )}
        </div>
      )}
    </div>
  );
};

export default SleepTimerButton;
