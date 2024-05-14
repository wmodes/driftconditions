// client/src/pages/Homepage.js

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchQueuePlaylist } from '../store/queueSlice';
import { renderPlaylist } from '../utils/queueUtils';
import FeatherIcon from 'feather-icons-react';
import AudioPlayer from '../components/AudioPlayer'; 
import HeroImage from '../components/HeroImage';
import { generateRandomTexts } from '../utils/textUtils'; 

import config from '../config/config';
// pull variables from the config object
const streamURL = config.stream.url;

const Homepage = () => {
  const dispatch = useDispatch();
  const [playlist, setPlaylist] = useState([]); 
  const [generatedText, setGeneratedText] = useState([]);
  // Access projectName from the global state
  const projectName = useSelector(state => state.app.projectName);

  useEffect(() => {
    // Assuming generateRandomTexts is a function that accepts projectName and returns an array of text strings
    const generatedText = generateRandomTexts(projectName);
    setGeneratedText(generatedText);

    // Fetch the playlist and handle it locally
    const loadPlaylist = async () => {
      try {
        const result = await dispatch(fetchQueuePlaylist()).unwrap();
        setPlaylist(result); // Set the fetched playlist to local state
        // console.log('Playlist:', result);
      } catch (error) {
        console.error('Failed to fetch playlist:', error);
      }
    };
    loadPlaylist();

    // Reload every 2 minutes (120,000 milliseconds)
    const intervalId = setInterval(loadPlaylist, 120000);
    
  }, [projectName, dispatch]);

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
              <HeroImage />
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
            </div> {/* end narrative-wrapper */}

          </div> {/* end column1 */}

          <div className="column2">

            <div className='playlist-wrapper mt-4'>
              <h2 className='title'>
              <FeatherIcon icon="list" />&nbsp;playlist</h2>
              <div className="playlist text-center">
                {/* put playlist here updated every minute or so */}
                <div className="playlist-wrapper">
                  {renderPlaylist(playlist)}
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
