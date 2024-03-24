import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { recipeInfo } from '../store/recipeSlice';

import { 
  formatDateForDisplay, formatListForDisplay, formatTagsForDisplay, 
  formatJSONForDisplay } from '../utils/formatUtils';
import FeatherIcon from 'feather-icons-react';

import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-github';

// get config object from config.js file 
import config from '../config/config';
const aceOptions = config.aceEditor;

function RecipeView() {
  const { recipeID } = useParams();
  console.log('recipeID:', recipeID);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Success and error handling
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [recipeRecord, setRecipeRecord] = useState({});

  useEffect(() => {
    if (!recipeID) return;
    setIsLoading(true); // Start loading

    dispatch(recipeInfo({recipeID}))
      .unwrap()
      .then(response => {
        setRecipeRecord(prevState => ({
          ...recipeRecord,
          ...response,
          recipeData: formatJSONForDisplay(response.recipeData),
          classification: formatListForDisplay(response.classification),
          tags: formatTagsForDisplay(response.tags),
          createDate: formatDateForDisplay(response.createDate),
          editDate: formatDateForDisplay(response.editDate),
        }));
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
    <div className="view-wrapper">
      <div className="display-box-wrapper">
        <div className="display-box">
          <h2 className='title'>View Recipe Details</h2>
          
          <div className="form-group">
            <div className="form-row">
              <span className="form-label">Name:</span>
              <span className="form-value">{recipeRecord.title}</span>
            </div>

            <div className="form-row">
              <span className="form-label">Description:</span>
              <span className="form-value">{recipeRecord.description}</span>
            </div>

            <div className="form-row">
              <span className="form-label">Created:</span>
              <span className="form-value">
                <Link to={`/recipe/list?filter=user&targetID=${recipeRecord.creatorUsername}`}>
                  {recipeRecord.creatorUsername}
                </Link>
                {" on " + recipeRecord.createDate}
              </span>
            </div>

            {recipeRecord.editorUsername && (
                <div className="form-row">
                  <span className="form-label">Edited:</span>
                  <span className="form-value">
                    <Link to={`/recipe/list?filter=user&targetID=${recipeRecord.editorUsername}`}>
                      {recipeRecord.editorUsername}
                    </Link>
                    {" on " + recipeRecord.editDate}
                  </span>
                </div>
              )
            }

            <div className="form-row">
              <span className="form-label">Status:</span>
              <span className="form-value">{recipeRecord.status}</span>
            </div>
          </div>

          <div className="form-group">
            <div className="form-label">Recipe Data:</div>
            <AceEditor
              mode="json"
              theme="github"
              name="recipeData"
              className="code-editor"
              value={recipeRecord.recipeData}
              readOnly={true}
              editorProps={{ $blockScrolling: true }}
              setOptions={aceOptions}
              style={{ width: '', height: 'auto' }}
            />
          </div>
  
          <div className="form-group">
            <div className="form-col">
              <div className="form-label">Classification:</div>
              <div className="form-value">
                {recipeRecord.classification}
              </div>
            </div>
            <div className="form-col">
              <div className="form-label">Tags:</div>
              <div className="form-value">{recipeRecord.tags}</div>
            </div>
            <div className="form-col">
              <div className="form-label">Comments:</div>
              <div className="form-value">{recipeRecord.comments}</div>
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
