import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { recipeInfo } from '../store/recipeSlice';

import { formatDateForDisplay, formatListForDisplay } from '../utils/formatUtils';
import FeatherIcon from 'feather-icons-react';

function RecipeView() {
  const { recipeID } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Success and error handling
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [recipeDetails, setRecipeDetails] = useState({
    title: '',
    creator_id: '',
    create_date: '',
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
      .then(response => {
        setRecipeDetails({
          ...response,
          classification: formatListForDisplay(response.classification),
          tags: formatListForDisplay(response.tags),
          create_date: formatDateForDisplay(response.create_date),
        });
        setIsLoading(false); // Stop loading once data is fetched
      })
      .catch(err => {
        console.error('Error fetching recipe details:', err);
        setError('Failed to fetch recipe details.');
        setIsLoading(false); // Stop loading on error
      });
  }, [recipeID, dispatch]);

  // Function to render breadcrumbs with navigation controls
  const renderBreadcrumbs = () => {
    return (
      <div className="breadcrumb-box">
        <span className="link" onClick={() => navigate('/recipe/list')}>
          <FeatherIcon icon="arrow-left" /> List
        </span>
        <span className="link" onClick={() => navigate(`/recipe/edit/${recipeID}`)}>
          Edit
        </span>
      </div>
    );
  };

  return (
    <div className="edit-wrapper">
      <div className="display-box-wrapper">
        <div className="display-box">
          <h2 className='title'>View Recipe Details</h2>
          <div className="form-group">
            <div className="form-row">
              <span className="form-label">Name:</span>
              <span className="form-value">{recipeDetails.title}</span>
            </div>
            <div className="form-row">
              <span className="form-label">Description:</span>
              <span className="form-value">{recipeDetails.description}</span>
            </div>
            <div className="form-row">
              <span className="form-label">Status:</span>
              <span className="form-value">{recipeDetails.status}</span>
            </div>
            <div className="form-row">
              <span className="form-label">Recipe Data:</span>
              <textarea readOnly value={recipeDetails.recipe_data} className="form-value textarea-readonly" />
            </div>
          </div>
  
          <div className="form-group">
            <div className="form-col">
              <div className="form-label">Classification:</div>
              <div className="form-value">
                {recipeDetails.classification}
              </div>
            </div>
            <div className="form-col">
              <div className="form-label">Tags:</div>
              <div className="form-value">{recipeDetails.tags}</div>
            </div>
            <div className="form-col">
              <div className="form-label">Comments:</div>
              <div className="form-value">{recipeDetails.comments}</div>
            </div>
          </div>

          <div className='message-box'>
            {isLoading && <p className="success">Loading...</p>}
            {error && <p className="error">{error}</p>}
          </div>
  
          {renderBreadcrumbs()}
        </div>
      </div>
    </div>
  );  
}

export default RecipeView;
