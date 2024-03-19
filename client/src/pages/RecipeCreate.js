import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { recipeCreate } from '../store/recipeSlice';
import RecipeForm from '../components/RecipeForm'; // Adjust the import path as needed
import FeatherIcon from 'feather-icons-react';
import Waiting from '../utils/appUtils';

import { 
  formatDateForDisplay, formatListForDisplay, 
  formatTagStrForDB, formatTagsForDisplay, 
  formatJSONForDisplay, formatJSONStrForDB } from '../utils/formatUtils';

// Import the config object from the config.js file
import config from '../config/config';
// pull variables from the config object
const classificationOptions = config.recipe.classification;

function RecipeCreate() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // State for handling loading, success, and error feedback
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  // TODO: Does this really do what it says?
  // Instead of re-initializing the form upon error, maintain its current state
  const [recipeRecord, setRecipeRecord] = useState({
    recipe_data: formatJSONForDisplay(config.recipe.example),
    status: 'Review',
    // turn classificationOptions into an object with keys for each option (set to false)
    classification: classificationOptions.reduce((acc, option) => {
      acc[option] = false;
      return acc;
    }, {}),
  });

  // we don't need to massage the data because RecipeForm will handle that
  const handleChange = (updatedRecord) => { 
    setRecipeRecord(updatedRecord);
  };

  const handleSave = (updatedRecord) => {
    setIsLoading(true); // Start loading
    const adjustedRecord = {
      ...updatedRecord,
      recipe_data: formatJSONStrForDB(updatedRecord.recipe_data),
      tags: formatTagStrForDB(updatedRecord.tags),
      classification: Object.keys(updatedRecord.classification).filter(key => updatedRecord.classification[key]),
    };
    dispatch(recipeCreate(adjustedRecord))
      .unwrap()
      .then(response => {
        setIsLoading(false); // Stop loading
        setSuccessMessage('Recipe created successfully!');
        navigate(`/recipe/view/${response.recipeID}`); // Redirect to view the new recipe
      })
      .catch(error => {
        setIsLoading(false); // Stop loading
        console.error('Failed to create new recipe:', error);
        setError('Failed to create new recipe.'); // Display error message
      });
  };

  const handleCancel = () => {
    navigate('/recipe/list');
  };

  const renderBreadcrumbs = () => {
    return (
      <div className="breadcrumb-box">
        <span className="link" onClick={() => navigate('/recipe/list')}>
          <FeatherIcon icon="arrow-left" /> List
        </span>
      </div>
    );
  };

  if (isLoading) {
    return (<Waiting />);
  }

  return (
    <div className="edit-wrapper">
      <div className="display-box-wrapper">
        <div className="display-box">
          <h2 className='title'>Create New Recipe</h2>
          <RecipeForm
            action="create"
            initialRecipe={recipeRecord}
            onSave={handleSave}
            onCancel={handleCancel}
            onChange={handleChange}
          />
          <div className='message-box'>
            {successMessage && <p className="success">{successMessage}</p>}
            {error && <p className="error">{error}</p>}
          </div>
          {renderBreadcrumbs()}
        </div>
      </div>
    </div>
  );
}

export default RecipeCreate;
