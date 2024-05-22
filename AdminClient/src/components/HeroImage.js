// HerpImage.js - component for the homepage hero image

import React from 'react';
import { useSelector } from 'react-redux';

// Import the config object from the config.js file
import config from '../config/config';
// pull variables from the config object
const homepageImages = config.app.homepageImages;
const homepageImageURLBase = config.app.homepageImageURLBase;


const HeroImage = () => {
  // Retrieve configuration variables
  const { homepageImages, homepageImageURLBase } = config.app;
  const projectName = useSelector(state => state.app.projectName);

  // Function to generate a hash from date and projectName
  const generateHash = () => {
    const date = new Date();
    const weekNumber = getWeekNumber(date);
    const month = date.getMonth();
    const year = date.getFullYear();
    const projectHash = stringToHash(projectName);
    const hashKey = `${projectHash}${weekNumber}${month}${year}`;
    return parseInt(hashKey, 10); // Convert hash to integer
  };

  // Function to generate a simple hash from a string
  const stringToHash = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash); // Ensure it's a positive number
  };

  // Function to get week number of the current date
  const getWeekNumber = (date) => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((projectName + pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  // Calculate the index for the current image
  const imageIndex = generateHash() % homepageImages.length;
  const imageUrl = `${homepageImageURLBase}/${homepageImages[imageIndex]}`;

  return (
    <div className="hero-image-container">
      <img src={imageUrl} alt="Hero" />
    </div>
  );
};

export default HeroImage;
