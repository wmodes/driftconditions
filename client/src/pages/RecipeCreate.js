import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { recipeCreate } from '../store/recipeSlice';
import RecipeForm from '../components/RecipeForm'; // Adjust the import path as needed
import FeatherIcon from 'feather-icons-react';
import Waiting from '../utils/appUtils';

function RecipeCreate() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // State for handling loading, success, and error feedback
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  // Instead of re-initializing the form upon error, maintain its current state
  const [recipeRecord, setRecipeRecord] = useState({
    title: '',
    description: '',
    recipe_data: '',
    status: 'Review',
    classification: '',
    tags: "",
    comments: '',
  });

  const handleChange = (updatedRecord) => {
    setRecipeRecord(updatedRecord);
  };

  const handleSave = (recipeDetails) => {
    setIsLoading(true); // Start loading
    dispatch(recipeCreate(recipeDetails))
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
    <div className="create-wrapper">
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
