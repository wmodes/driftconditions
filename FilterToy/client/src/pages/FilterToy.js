// FilterToy.js - Page component for the FilterToy page

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchFfmpegCapabilities } from '../store/ffmpegInfoSlice';
import { processFilterChain } from '../store/filterTestSlice';
import FilterEditor from '../components/FilterEditor'; 
import CapabilitiesInfo from '../components/CapabilitiesInfo';

import { formatJSONForDisplay, formatJSONStrForDB } from '../utils/formatUtils';
import Waiting from '../utils/appUtils';

// Import the config object from the config.js file
import config from '../config/config';
import { initial, set } from 'lodash';
// pull variables from the config object

function FilterToys() {
  const dispatch = useDispatch();
  const [ffmpegCapabilitiesData, setFfmpegCapabilitiesData] = useState({});

  // State for handling loading, success, and error feedback
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  // Fetch ffmpeg info from the store on component mount
  useEffect(() => {
    dispatch(fetchFfmpegCapabilities())
      .then(response => {
        if (response.payload) {
          // console.log('Fetched ffmpeg response:', response);
          setFfmpegCapabilitiesData(response.payload); // Set fetched data to local state
          logKeysWithAllValues(response.payload); // Log unique keys and values
        }
        setIsLoading(false); // Stop loading once data is fetched or an error occurs
      })
      .catch(error => {
        console.error('Failed to fetch ffmpeg info', error);
        setError('Failed to load data');
        setIsLoading(false); // Stop loading on error
      });
  }, [dispatch]);

  function logKeysWithAllValues(ffmpegCapabilitiesData) {
    // List all capability types
    const capabilityTypes = ['formats', 'codecs', 'encoders', 'filters'];
  
    capabilityTypes.forEach(type => {
      const items = ffmpegCapabilitiesData[type];
      if (!items) {
        console.log(`No items found for ${type}`);
        return;
      }
  
      // Collect all values for each unique key
      const keyValues = {};
      for (const itemKey in items) {
        const item = items[itemKey];
        for (const [key, value] of Object.entries(item)) {
          if (!keyValues[key]) {
            keyValues[key] = [];  // Initialize an array if this is the first encounter with the key
          }
          if (!keyValues[key].includes(value)) { // To avoid duplicates in the array
            keyValues[key].push(value);
          }
        }
      }
  
      // Log the results as a data structure for this capability type
      console.log(`Keys and all associated values for ${type}:`, keyValues);
    });
  }  
  

  // get initial filterChain from localStorate or create a new one
  const getInitialFilterChain = () => {
    const storedFilterChain = localStorage.getItem('filterChain');
    if (storedFilterChain) {
      return JSON.parse(storedFilterChain);
    }
    return {
      // put inital filter chain here
    }
  }

  // State repository for managing form inputs
  const initialFilterChain = getInitialFilterChain();
  console.log(`initialFilterChain: ${JSON.stringify(initialFilterChain, null, 2)}`);
  const [filterChain, setFilterChain] = useState(initialFilterChain);

  // we don't need to massage the data because FilterEditor will handle that
  const handleChange = (updatedFilter) => {
    setFilterChain(updatedFilter);
    // store the updated filter chain in localStorage
    localStorage.setItem('filterChain', JSON.stringify(updatedFilter));
  };

  const handleSubmit = (updatedFilter) => {
    setIsLoading(true); // Start loading on save
    console.log(`updatedFilter: ${JSON.stringify(updatedFilter, null, 2)}`);
    dispatch(processFilterChain({ adjustedFilter: updatedFilter }))
      .unwrap()
      .then(() => {
        setSuccessMessage('Test successful!');
        setError('');
        setIsLoading(false); // Stop loading once update is successful      
      })
      .catch((err) => {
        console.error('Test error:', err);
        setError('Test failed - check output.');
        setIsLoading(false); // Stop loading on error
        // Retain the current form state on error to allow for corrections
        setFilterChain(updatedFilter);
      });
  };

  if (isLoading) {
    return (<Waiting />);
  }

  return (
    <div>
      <div className="edit-wrapper">
        <div className="display-box-wrapper">
          <div className="display-box">
            <h2 className='title'>FilterToy - Test ffmpeg ComplexFilter</h2>
            <FilterEditor
              action="update"
              initFilterChain={JSON.stringify(filterChain)}
              onSave={handleSubmit}
              onChange={handleChange} // Ensure RecipeForm calls this function with updated state
            />
            <div className='message-box'>
              {successMessage && <p className="success">{successMessage}</p>}
              {error && <p className="error">{error}</p>}
            </div>
          </div>
        </div>
      </div>
      <div>
      {ffmpegCapabilitiesData && Object.keys(ffmpegCapabilitiesData).length > 0 ? (
          <CapabilitiesInfo capabilitiesData={ffmpegCapabilitiesData} />
        ) : (
          <p>No data available.</p>
        )}
      </div>
    </div>
  );
}

export default FilterToys;
