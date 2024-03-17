import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { recipeInfo, recipeUpdate } from '../store/recipeSlice';
import RecipeForm from '../components/RecipeForm'; // Adjust the import path as needed
import { formatDateForDisplay, formatTagStrForDB, formatTagsForDisplay } from '../utils/formatUtils';
import FeatherIcon from 'feather-icons-react';
import Waiting from '../utils/appUtils';

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
        setRecipeDetails(response);
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
    // Normalize tags before submitting
    const normalizedTags = formatTagStrForDB(updatedRecord.tags);
    const adjustedRecord = {
      ...updatedRecord,
      tags: normalizedTags,
    };
    dispatch(recipeUpdate({ recipeID, ...adjustedRecord }))
      .unwrap()
      .then(() => {
        setSuccessMessage('Update successful!');
        setError('');
        setIsLoading(false); // Stop loading once update is successful        // Update recipeDetails state with normalized tags to reflect in the input field
        setRecipeDetails(prevDetails => ({
          ...prevDetails,
          // Convert array back to string for input field
          tags: formatTagsForDisplay(normalizedTags) 
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
