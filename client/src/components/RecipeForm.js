

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-github';
import config from '../config/config';
const aceOptions = config.aceEditor;

function RecipeForm({ action, initialRecipe, onSave, onCancel, onChange }) {
  // State to hold the form data
  const [recipeRecord, setRecipeRecord] = useState(initialRecipe);

  // Effect to initialize form with initialRecipe data when editing
  useEffect(() => {
    setRecipeRecord(initialRecipe);
  }, [initialRecipe]);

  // Local handleChange function updates local state and calls parent callback
  const handleChange = (event) => {
    const { name, value } = event.target;
    // Update the local state first
    const updatedRecord = { ...recipeRecord, [name]: value };
    setRecipeRecord(updatedRecord);

    // Then call the onChange callback provided by the parent, if available
    if (onChange) {
      onChange(updatedRecord);
    }
  };

  // Submit form
  const handleSubmit = (event) => {
    event.preventDefault();
    const submissionData = {
      ...recipeRecord,
    };
    onSave(submissionData);
  };

  const handleAceChanges = (newValue) => {
    // Update recipe_data directly within the local state
    const updatedRecord = { ...recipeRecord, recipe_data: newValue };
    setRecipeRecord(updatedRecord);

    // Then call the onChange callback provided by the parent, if available
    if (onChange) {
      onChange(updatedRecord);
    }
  };

  const Required = () => <span className="required">*</span>;

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label" htmlFor="title">Recipe Name: <Required /></label>
        <input className="form-field" type="text" id="title" name="title" value={recipeRecord.title} onChange={handleChange} />

        <label className="form-label" htmlFor="description">Description: <Required /></label>
        <textarea className="form-textarea" id="description" name="description" value={recipeRecord.description} onChange={handleChange}></textarea>
        
        {action!=="create" && (
          <>
            <div className="form-row">
              <span className="form-label">Created:</span>
              <span className="form-value">
                <Link to={`/recipe/list?filter=user&targetID=${recipeRecord.creator_username}`}>
                  {recipeRecord.creator_username}
                </Link>
                {" on " + recipeRecord.create_date}
              </span>
            </div>

            {recipeRecord.editor_username && (
                <div className="form-row">
                  <span className="form-label">Edited:</span>
                  <span className="form-value">
                    <Link to={`/recipe/list?filter=user&targetID=${recipeRecord.editor_username}`}>
                      {recipeRecord.editor_username}
                    </Link>
                    {" on " + recipeRecord.edit_date}
                  </span>
                </div>
              )
            }
          </>
        )}
  
        <label className="form-label" htmlFor="status">Status:</label>
        <select name="status" value={recipeRecord.status} onChange={handleChange} className="form-select">
          <option value="Review">Under Review</option>
          <option value="Approved" disabled={action === "create"}>Approved</option>
          <option value="Disapproved" disabled={action === "create"}>Disapproved</option>
          <option value="Trashed" disabled={action === "create"}>Trashed</option>
        </select>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="recipe_data">Recipe Data: <Required /></label>

        <AceEditor
          mode="json"
          theme="github"
          name="recipe_data"
          value={recipeRecord.recipe_data}
          onChange={handleAceChanges}
          editorProps={{ $blockScrolling: true }}
          setOptions={aceOptions}
          style={{ width: '', height: 'auto' }}
        />
        <div className="form-note mt-3 mb-0">Data will be converted to valid JSON, so comments will be removed.</div>  
      </div>
  
      <div className="form-group">
        <label className="form-label" htmlFor="tags">Tags (comma-separated):</label>
        <input className="form-field" type="text" id="tags" name="tags" value={recipeRecord.tags} onChange={handleChange} />
        <p className="form-note">Separated with commas</p>
        
        <label className="form-label" htmlFor="comments">Comments:</label>
        <textarea className="form-textarea" id="comments" name="comments" value={recipeRecord.comments} onChange={handleChange}></textarea>
      </div>
  
      <div className='button-box'>
        <button className='button cancel' type="button" onClick={onCancel}>Cancel</button>
        <button className='button submit' type="submit">Save Recipe</button>
      </div>
    </form>
  );
}

export default RecipeForm;