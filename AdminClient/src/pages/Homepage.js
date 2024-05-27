// client/src/pages/Homepage.js

import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
// import { fetchQueuePlaylist } from '../store/queueSlice';
// import { renderPlaylist } from '../utils/queueUtils';
import FeatherIcon from 'feather-icons-react';
import AudioPlayer from '../components/AudioPlayer'; 
import Playlist from '../components/Playlist';
import { generateRandomTexts, getProjectName, getHeroImageURL} from '../utils/randomUtils'; 

import config from '../config/config';
// pull variables from the config object
const streamURL = config.stream.url;

const Homepage = () => {
  const dispatch = useDispatch();
  const [playlist, setPlaylist] = useState([]); 
  const [generatedText, setGeneratedText] = useState([]);
  
  const projectName = getProjectName();

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

            <div className='player-wrapper mb-8'>
              <h2 className='title'>
              <FeatherIcon icon="volume-2" />&nbsp;listen</h2>
              <div className="player text-center">
                <p>Listen to { projectName } live. The broadcast is assembled live, on-the-fly, and will never be heard exactly the same again.</p>
                <div className="flex justify-center w-full">
                  {/* <audio controls className="inline-block">
                    <source src="https://driftconditions.org:8000/stream" type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>                  */}
                  <AudioPlayer url={streamURL} />
                </div>
              </div>
            </div>

            <div className='narrative-wrapper'>
              <h2 className='title'>
              <FeatherIcon icon="radio" />&nbsp;tune in</h2>
              <div className="text">
                <p key={0} dangerouslySetInnerHTML={createMarkup(generatedText[0])}></p> 
                <p key={1} dangerouslySetInnerHTML={createMarkup(generatedText[1])}></p> 
                <p className="pullquote" key={2} dangerouslySetInnerHTML={createMarkup(generatedText[2])}></p>
                <p key={3} dangerouslySetInnerHTML={createMarkup(generatedText[3])}></p> 
              </div>
              <div className="contact">
                <p>Need to reach us? <a className="link" 
                href="mailto:info@driftconditions.org">Okay.</a></p>
              </div>
            </div> {/* end narrative-wrapper */}

          </div> {/* end column1 */}

          <div className="column2">

            <div className='playlist-wrapper mt-4'>
              <h2 className='title'>
              <FeatherIcon icon="list" />&nbsp;playlist</h2>
              <div className="playlist text-center">
                {/* put playlist here updated every minute or so */}
                <div className="playlist-wrapper">
                  {/* {renderPlaylist(playlist)} */}
                  <Playlist />
                </div>
              </div>
            </div>

          </div> {/* end column2 */}

        </div> 
      </div> 
    </div> 
  );
};

export default Homepage;
