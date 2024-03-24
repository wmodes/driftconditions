import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { recipeInfo, recipeUpdate } from '../store/recipeSlice';
import RecipeForm from '../components/RecipeForm'; // Adjust the import path as needed

import { 
  formatDateForDisplay, formatListForDisplay, 
  formatTagStrForDB, formatTagsForDisplay, 
  formatJSONForDisplay, formatJSONStrForDB, 
  setClassificationFormOptions, formatClassificationForDB } from '../utils/formatUtils';
  import { ClassificationCheckboxes } from '../utils/formUtils';
import FeatherIcon from 'feather-icons-react';
import Waiting from '../utils/appUtils';

// Import the config object from the config.js file
import config from '../config/config';
// pull variables from the config object
const classificationOptions = config.recipes.classification;

// TODO: Install  5 and render recipeData as JSON. Also in RecipeCreate

function RecipeEdit() {
  const { recipeID } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // State for handling loading, success, and error feedback
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  // State repository for managing form inputs
  const [recipeRecord, setRecipeRecord] = useState({
    // turn classificationOptions into an object with keys for each option (set to false)
    classification: setClassificationFormOptions(classificationOptions, false),
  });

  useEffect(() => {
    if (!recipeID) return;
    setIsLoading(true); // Start loading

    dispatch(recipeInfo({recipeID}))
      .unwrap()
      .then((response) => {
        // console.log('response:', response)
        // Parse and transform the response as needed
        setRecipeRecord(prevState => ({
          ...prevState,
          ...response,
          recipeData: formatJSONForDisplay(response.recipeData),
          tags: formatTagsForDisplay(response.tags),
          createDate: formatDateForDisplay(response.createDate),
          editDate: formatDateForDisplay(response.editDate),
          classification: setClassificationFormOptions(classificationOptions, response.classification),
        }));
        // console.log('recipeRecord:', recipeRecord);
        setIsLoading(false); // Stop loading once data is fetched
      })
      .catch((err) => {
        console.error('Error fetching recipe details:', err);
        setError('Failed to fetch recipe details.');
        setIsLoading(false); // Stop loading on error
      });
  }, [recipeID, dispatch]);

  // we don't need to massage the data because RecipeForm will handle that
  const handleChange = (updatedRecord) => {
    setRecipeRecord(updatedRecord);
  };

  const handleSubmit = (updatedRecord) => {
    setIsLoading(true); // Start loading on save
    const adjustedRecord = {
      ...updatedRecord,
      recipeData: formatJSONStrForDB(updatedRecord.recipeData),
      tags: formatTagStrForDB(updatedRecord.tags),
      classification: formatClassificationForDB(updatedRecord.classification),
    };
    console.log('handleSubmit: adjustedRecord:', adjustedRecord);
    dispatch(recipeUpdate({ recipeRecord: adjustedRecord }))
      .unwrap()
      .then(() => {
        setSuccessMessage('Update successful!');
        setError('');
        setIsLoading(false); // Stop loading once update is successful        
        // Update recipeDetails state with normalized tags to reflect in the input field
        setRecipeRecord(prevDetails => ({
          ...prevDetails,
          // Convert stuff back to strings for input fields
          recipeData: formatJSONForDisplay(adjustedRecord.recipeData),
          tags: formatTagsForDisplay(adjustedRecord.tags), 
        }));
      })
      .catch((err) => {
        console.error('Update error:', err);
        setError('Failed to update recipe.');
        setIsLoading(false); // Stop loading on error
        // Retain the current form state on error to allow for corrections
        setRecipeRecord(updatedRecord);
      });
  };

  const handleCancel = () => {
    navigate(`/recipe/view/${recipeID}`);
  };

  const renderBreadcrumbs = () => {
    return (
      <div className="breadcrumb-box">
        <span className="link" onClick={() => navigate('/recipe/list')}>
          <FeatherIcon icon="arrow-left" /> List
        </span>
        <span className="link" onClick={() => navigate(`/recipe/view/${recipeID}`)}>
          View
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
          <h2 className='title'>Edit Recipe</h2>
          <RecipeForm
            action="update"
            initialRecipe={recipeRecord}
            onSave={handleSubmit}
            onCancel={handleCancel}
            onChange={handleChange} // Ensure RecipeForm calls this function with updated state
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

export default RecipeEdit;