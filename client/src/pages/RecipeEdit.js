import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { recipeInfo, recipeUpdate } from '../store/recipeSlice';
import RecipeForm from '../components/RecipeForm'; // Adjust the import path as needed

import { 
  formatDateForDisplay, formatListForDisplay, 
  formatTagStrForDB, formatTagsForDisplay, 
  formatJSONForDisplay, formatJSONStrForDB } from '../utils/formatUtils';
import FeatherIcon from 'feather-icons-react';
import Waiting from '../utils/appUtils';

const JSON5 = require('json5');

// TODO: Install JSON5 and render recipe_data as JSON. Also in RecipeCreate

function RecipeEdit() {
  const { recipeID } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // State for handling loading, success, and error feedback
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  // Manage recipe details state similar to RecipeCreate's recipeData
  const [recipeDetails, setRecipeDetails] = useState({
    title: '',
    description: '',
    recipe_data: '',
    status: '',
    classification: '',
    tags: '',
    comments: '',
  });

  useEffect(() => {
    if (!recipeID) return;
    setIsLoading(true); // Start loading

    dispatch(recipeInfo(recipeID))
      .unwrap()
      .then((response) => {
        setRecipeDetails(prevState => ({
          ...recipeDetails,
          ...response,
          recipe_data: formatJSONForDisplay(response.recipe_data),
          classification: formatListForDisplay(response.classification),
          tags: formatTagsForDisplay(response.tags),
          create_date: formatDateForDisplay(response.create_date),
        }));
        setIsLoading(false); // Stop loading once data is fetched
      })
      .catch((err) => {
        console.error('Error fetching recipe details:', err);
        setError('Failed to fetch recipe details.');
        setIsLoading(false); // Stop loading on error
      });
  }, [recipeID, dispatch]);

  const handleChange = (updatedRecord) => {
    setRecipeDetails(updatedRecord);
  };

  const handleSave = (updatedRecord) => {
    setIsLoading(true); // Start loading on save
    const adjustedRecord = {
      ...updatedRecord,
      recipe_data: formatJSONStrForDB(updatedRecord.recipe_data),
      tags: formatTagStrForDB(updatedRecord.tags),
    };
    dispatch(recipeUpdate({ recipeID, ...adjustedRecord }))
      .unwrap()
      .then(() => {
        setSuccessMessage('Update successful!');
        setError('');
        setIsLoading(false); // Stop loading once update is successful        
        // Update recipeDetails state with normalized tags to reflect in the input field
        setRecipeDetails(prevDetails => ({
          ...prevDetails,
          // Convert stuff back to strings for input fields
          recipe_data: formatJSONForDisplay(adjustedRecord.recipe_data),
          tags: formatTagsForDisplay(adjustedRecord.tags), 
        }));
      })
      .catch((err) => {
        console.error('Update error:', err);
        setError('Failed to update recipe.');
        setIsLoading(false); // Stop loading on error
        // Retain the current form state on error to allow for corrections
        setRecipeDetails(updatedRecord);
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
            initialRecipe={recipeDetails}
            onSave={handleSave}
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
