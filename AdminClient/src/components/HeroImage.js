// HerpImage.js - component for the homepage hero image

import React from 'react';

// Import the config object from the config.js file
import config from '../config/config';
// pull variables from the config object
const homepageImages = config.app.homepageImages;
const homepageImageURLBase = config.app.homepageImageURLBase;


const HeroImage = () => {
  // Retrieve configuration variables
  const { homepageImages, homepageImageURLBase } = config.app;

  // Function to generate a hash from date
  const generateHashFromDate = () => {
    const date = new Date();
    const weekNumber = getWeekNumber(date);
    const month = date.getMonth();
    const year = date.getFullYear();
    const hash = `${weekNumber}${month}${year}`;
    return parseInt(hash, 10); // Convert hash to integer
  };

  // Function to get week number of the current date
  const getWeekNumber = (date) => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  // Calculate the index for the current image
  const imageIndex = generateHashFromDate() % homepageImages.length;
  const imageUrl = `${homepageImageURLBase}/${homepageImages[imageIndex]}`;

  return (
    <div className="hero-image-container">
      <img src={imageUrl} alt="Hero" />
    </div>
  );
};

export default HeroImage;
