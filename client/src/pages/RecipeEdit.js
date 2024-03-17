import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { recipeInfo, recipeUpdate } from '../store/recipeSlice';
import RecipeForm from '../components/RecipeForm'; 
import FeatherIcon from 'feather-icons-react';

function RecipeEdit() {
  const { recipeID } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  const [recipeDetails, setRecipeDetails] = useState(null);

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

  const handleSave = (updatedDetails) => {
    setIsLoading(true); // Start loading on save
    dispatch(recipeUpdate({ recipeID, ...updatedDetails }))
      .unwrap()
      .then(() => {
        setSuccessMessage('Update successful!');
        setIsLoading(false); // Stop loading once update is successful
        navigate(`/recipes/view/${recipeID}`);
      })
      .catch((err) => {
        console.error('Update error:', err);
        setError('Failed to update recipe.');
        setIsLoading(false); // Stop loading on error
      });
  };

  const handleCancel = () => {
    navigate('/recipes/list');
  };

  const renderBreadcrumbs = () => {
    return (
      <div className="breadcrumb-box">
        <span className="link" onClick={() => navigate('/recipes/list')}>
          <FeatherIcon icon="arrow-left" /> List
        </span>
        <span className="link" onClick={() => navigate(`/recipes/view/${recipeID}`)}>
          View
        </span>
      </div>
    );
  };

  if (isLoading) {
    return <div>Loading...</div>; // or any loading indicator
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
