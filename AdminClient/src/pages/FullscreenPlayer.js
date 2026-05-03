// FullscreenPlayer.js — full-viewport player overlay

import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import FeatherIcon from 'feather-icons-react';
import { resolveCoverImageURL } from '../utils/queueUtils';
import { fetchQueuePlaylist } from '../store/queueSlice';
import { getHeroImageURL } from '../utils/randomUtils';
import SleepTimerButton from '../components/SleepTimerButton';
import brand from '../brand/brand';
import config from '../config/config';

const adminServerBaseURL = config.adminServer.baseURL;

const FullscreenPlayer = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { togglePlayer, isPlaying, sleepTimerEnd, setSleepTimerEnd } = useOutletContext();
  const [altImages, setAltImages] = useState([]);

  // fetch playlist on mount so reloading directly on /fullscreen works
  useEffect(() => {
    dispatch(fetchQueuePlaylist());
  }, [dispatch]);

  // fetch alt images for cover fallback
  useEffect(() => {
    fetch(`${adminServerBaseURL}/api/audio/altimages`)
      .then(r => r.json())
      .then(setAltImages)
      .catch(() => {});
  }, []);

  // playlist[1] = currently playing mix
  const playlist = useSelector(state => state.queue.playlist);
  const currentMix = playlist[1];
  const coverImageURL = resolveCoverImageURL(currentMix?.coverImage);

  let mixPlaylist = currentMix?.playlist || [];
  if (!Array.isArray(mixPlaylist)) {
    mixPlaylist = mixPlaylist.playlist || [];
  }

  return (
    <div className="fullscreen">
      <button className="exit" onClick={() => navigate(-1)}>
        <FeatherIcon icon="x" />
      </button>

      <div className="cover">
        {coverImageURL
          ? <img src={coverImageURL} alt="Mix cover" onError={(e) => {
              e.target.onerror = null;
              const fallback = getHeroImageURL(altImages);
              if (fallback) e.target.src = fallback;
            }} />
          : <div className="placeholder" />
        }
      </div>

      <div className="info">
        <h2>{brand.name}</h2>
        {currentMix ? (
          <ul>
            {mixPlaylist.map((clip, i) => (
              <li key={i}>{clip.title}</li>
            ))}
          </ul>
        ) : (
          <p>Nothing playing yet.</p>
        )}

        <div className={`faux-player ${isPlaying ? 'playing' : ''}`}>
          <div className="audio-overlay">
            <div className="play-line"><FeatherIcon icon="circle" /></div>
          </div>
        </div>

        <div className="play-control">
          <button onClick={togglePlayer}>
            <FeatherIcon icon={isPlaying ? 'pause' : 'play'} />
          </button>
        </div>

        <div className="controls">
          <button onClick={() => navigate(-1)}>
            <FeatherIcon icon="minimize-2" />
          </button>
          <SleepTimerButton sleepTimerEnd={sleepTimerEnd} setSleepTimerEnd={setSleepTimerEnd} isPlaying={isPlaying} onPlay={togglePlayer} />
        </div>
      </div>
    </div>
  );
};

export default FullscreenPlayer;
