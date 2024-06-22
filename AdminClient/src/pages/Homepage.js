// client/src/pages/Homepage.js

import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import FeatherIcon from 'feather-icons-react';
import Playlist from '../components/Playlist';
import { 
  generateRandomTexts, getProjectName, 
  getHeroImageURL, getLocation 
} from '../utils/randomUtils'; 

const Homepage = () => {
  const [playlist, setPlaylist] = useState([]); 
  const [generatedText, setGeneratedText] = useState([]);
  
  const projectName = getProjectName();
  const location = getLocation();

  const { togglePlayer, isPlaying } = useOutletContext();

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
                <img src={getHeroImageURL()} alt="Hero" />
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
                  You have audio you think would fit {projectName}? Signup for an account, and then{' '}
                  <a  className="link" target="_new" href="mailto:info@driftconditions.org?subject=please%20promote%20me%20to%20a%20contributor">
                    hit us up
                  </a>.
                </p>
                <p className="contact">
                  Need to reach us? <a className="link"                 href="mailto:info@driftconditions.org">Okay.</a>
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
