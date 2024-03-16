// client/src/pages/Homepage.js

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
// feather icons
import FeatherIcon from 'feather-icons-react';
// tracery text
import { generateRandomTexts } from '../utils/textUtils'; 

const Homepage = () => {
  // Access projectName from the global state
  const projectName = useSelector(state => state.app.projectName); 
  const [generatedText, setGeneratedText] = useState([]);

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
            <h2 className='title'>
              <FeatherIcon icon="radio" />&nbsp;tune in</h2>
              <div className="text">
                <p key={0} dangerouslySetInnerHTML={createMarkup(generatedText[0])}></p> 
                <p key={1} dangerouslySetInnerHTML={createMarkup(generatedText[1])}></p> 
                <p className="pullquote" key={2} dangerouslySetInnerHTML={createMarkup(generatedText[2])}></p>
                <p key={3} dangerouslySetInnerHTML={createMarkup(generatedText[3])}></p> 
              </div>
            </div>
            <div className="column2">
              <div className='player'>
              <h2 className='title'>
              <FeatherIcon icon="volume-2" />&nbsp;listen</h2>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Homepage;
