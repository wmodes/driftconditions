// client/src/pages/Homepage.js

import React, { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import FeatherIcon from 'feather-icons-react';
import Playlist from '../components/Playlist';
import {
  generateRandomTexts, getHeroImageURL, getLocation
} from '../utils/randomUtils';
import brand from '../brand/brand';
import config from '../config/config';

// Resolve a coverImage path (e.g. "img/audio/152.jpg" or "img/alt/tintype-tower.jpg") to a URL.
const resolveCoverImageURL = (coverImage) => {
  if (!coverImage) return null;
  return `/${coverImage}`;
};

const adminServerBaseURL = config.adminServer.baseURL;

const Homepage = () => {
  const [generatedText, setGeneratedText] = useState([]);
  const [altImages, setAltImages] = useState([]);

  const projectName = brand.name;
  const contactEmail = brand.email.contact;
  const location = getLocation();

  // playlist[0] is the Liquidsoap prefetch (not yet on air); playlist[1] is currently playing
  const playlist = useSelector(state => state.queue.playlist);
  const recentCoverImage = resolveCoverImageURL(playlist[1]?.coverImage);
  const heroImageURL = recentCoverImage || getHeroImageURL(altImages);

  const { togglePlayer, isPlaying } = useOutletContext();
  const user = useSelector(state => state.auth.user);

  // Fetch alt image list once on mount for fallback hero image
  useEffect(() => {
    fetch(`${adminServerBaseURL}/api/audio/altimages`)
      .then(r => r.json())
      .then(setAltImages)
      .catch(() => {});
  }, []);

  useEffect(() => {
    // Assuming generateRandomTexts is a function that accepts projectName and returns an array of text strings
    const generatedText = generateRandomTexts(projectName);
    setGeneratedText(generatedText);
  }, [projectName]);

  // Function to safely set inner HTML
  const createMarkup = (htmlString) => {
    return { __html: htmlString };
  };

  return (
    <div className="profile-edit-wrapper">
      <div className="homepage-box-wrapper">
        <div className="homepage-box">

          <div className="column1">

            <div className="image-wrapper mb-8">
              <div className="hero-image-container">
                {heroImageURL && <img src={heroImageURL} alt="Hero" onError={(e) => {
                  const fallback = getHeroImageURL(altImages);
                  if (fallback) e.target.src = fallback;
                }} />}
              </div>
            </div>

            <div className='minor-section mb-8'>
              <h2 className='title'>
              <FeatherIcon icon="volume-2" />&nbsp;listen</h2>
              <p>Listen to { projectName }. The broadcast is assembled live, on-the-fly, and will never be heard exactly the same again.</p>
                <div className={`faux-player ${isPlaying ? 'playing' : ''}`}>
                  <div className="audio-overlay" onClick={togglePlayer}>
                    <div className="play-button"><FeatherIcon icon="play" /></div>
                    <div className="pause-button"><FeatherIcon icon="pause" /></div>
                    <div className="text">Listen live</div>
                    <div className="play-line"><FeatherIcon icon="circle" /></div>
                    <div className="volume"><FeatherIcon icon="volume-2" /></div>
                  </div>
                </div>
            </div> {/* end player-wrapper */}

            <div className='minor-section'>
              <h2 className='title'>
              <FeatherIcon icon="radio" />&nbsp;tune in</h2>
              <div className="text">
                <p key={0} dangerouslySetInnerHTML={createMarkup(generatedText[0])}></p> 
                <p key={1} dangerouslySetInnerHTML={createMarkup(generatedText[1])}></p> 
                <p className="pullquote" key={2} dangerouslySetInnerHTML={createMarkup(generatedText[2])}></p>
                <p key={3} dangerouslySetInnerHTML={createMarkup(generatedText[3])}></p> 
              </div>
              <div className="footer-box">
                <p className="what-is-this">
                  { projectName } is a procedurally-generated audio stream mixed on-the-fly 24/7 from { location }.
                </p>
                <p>
                <Link className="link" to="/howitworks">Curious how it works?</Link> You're our kinda people. 
                </p>
                <p>
                  You have audio you think would fit {projectName}? <Link  className="link" to="/signup">Signup for an account,</Link> and then{' '}
                  <a className="link" target="_blank" rel="noopener noreferrer"
                    href={`mailto:${contactEmail}?subject=Please%20promote%20me%20to%20a%20contributor${user?.username ? `&body=My%20user%20name%20is%20${encodeURIComponent(user.username)}` : ''}`}>
                    hit us up
                  </a>.
                </p>
                <p className="contact">
                  Need to reach us for some other reason? <a className="link" href={`mailto:${contactEmail}`} target="_blank" rel="noopener noreferrer">Okay.</a>
                </p>
              </div>
            </div> {/* end narrative-wrapper */}

          </div> {/* end column1 */}

          <div className="column2">
            <div className='playlist-wrapper mt-4'>
              <h2 className='title'>
              <FeatherIcon icon="list" />&nbsp;playlist</h2>
              <Playlist />
            </div>
          </div> {/* end column2 */}

        </div> 
      </div> 
    </div> 
  );
};

export default Homepage;
