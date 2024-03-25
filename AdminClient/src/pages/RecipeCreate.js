import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { recipeCreate } from '../store/recipeSlice';
import RecipeForm from '../components/RecipeForm'; // Adjust the import path as needed
import { formatJSONForDisplay, formatJSONStrForDB, 
  setClassificationFormOptions, formatClassificationForDB } from '../utils/formatUtils';
import FeatherIcon from 'feather-icons-react';
import Waiting from '../utils/appUtils';

// Import the config object from the config.js file
import config from '../config/config';
// pull variables from the config object
const classificationOptions = config.recipes.classification;
const newRecipePattern = config.recipes.example;

function RecipeCreate() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // State for handling loading, success, and error feedback
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  // Instead of re-initializing the form upon error, maintain its current state
  const [record, setRecord] = useState({
    recipeData: formatJSONForDisplay(newRecipePattern),
    status: 'Review',
    // turn classificationOptions into an object with keys for each option (set to false)
    classification: setClassificationFormOptions(classificationOptions, false),
  });

  // we don't need to massage the data because RecipeForm will handle that
  const handleChange = (updatedRecord) => { 
    setRecord(updatedRecord);
  };

  const handleSave = (updatedRecord) => {
    setIsLoading(true); // Start loading
    const adjustedRecord = {
      ...updatedRecord,
      recipeData: formatJSONStrForDB(updatedRecord.recipeData),
      classification: formatClassificationForDB(updatedRecord.classification),
    };
    dispatch(recipeCreate({recipeRecord: adjustedRecord}))
      .unwrap()
      .then(response => {
        setIsLoading(false); // Stop loading
        setSuccessMessage('Recipe created successfully!');
        navigate(`/recipe/edit/${response.recipeID}`); // Redirect to view the new recipe
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
            initialRecipe={record}
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
