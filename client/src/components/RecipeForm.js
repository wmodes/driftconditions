

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-github';
import JSON5 from 'json5';
import { insertNewClipIntoJsonStr } from '../utils/recipeUtils';

import config from '../config/config';
const aceOptions = config.aceEditor;
const newTrackPattern = config.recipe.newTrack;
const newClipPattern = config.recipe.newClip;

function RecipeForm({ action, initialRecipe, onSave, onCancel, onChange }) {
  // State to hold the form data
  const [recipeRecord, setRecipeRecord] = useState(initialRecipe);
  const [resetRecord, setResetRecord] = useState(
    JSON.parse(JSON.stringify(initialRecipe))
  );
  // store a ref to the editor API
  const [editorRef, setEditorRef] = useState(null);

  console.log("RecipeForm: recipeRecord", recipeRecord)

  // State for handling loading, success, and error feedback
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  // Effect to initialize form with initialRecipe data when editing
  // useEffect(() => {
  //   // unnecessary
  //   // setRecipeRecord(initialRecipe);
  //   // make a copy for a form reset
  //   setResetRecord(JSON.parse(JSON.stringify(initialRecipe)))
  // }, [initialRecipe]);

  // Local handleChange function updates local state and calls parent callback
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      // Handle classification checkbox change
      setRecipeRecord(prevState => ({
        ...prevState,
        classification: { ...prevState.classification, [name]: checked }
      }));
    } else {
      setRecipeRecord(prevState => ({ ...prevState, [name]: value }));
    }    // Then call the onChange callback provided by the parent, if available
    if (onChange) {
      onChange(recipeRecord);
    }
  };

  // Submit form - handle data massage in the calling component
  const handleSubmit = (event) => {
    event.preventDefault();
    onSave(recipeRecord);
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

  const reset = () => {
    console.log("RecipeForm: resetRecord", resetRecord)
    setRecipeRecord(resetRecord);
  }

  const validate = () => {}

  // helper to parse JSON5 content
  function parseContent(content) {
    try {
      return JSON5.parse(content);
    } catch (error) {
      console.error('Failed to parse content:', error);
      setError('Failed to parse content. Error in your JSON5 syntax.'); 
      return null; // Handle this error appropriately in your application
    }
  }

  const addTrack = () => {
    setError(''); // Clear any previous error
    const data = parseContent(recipeRecord.recipe_data);
    console.log("data", data);
    console.log("typeof data", typeof data);
    if (!data || !Array.isArray(data)) return; // Error parsing content  
    
    // Find the highest existing track number
    const maxTrackNumber = data.reduce((max, item) => {
      return item.track && item.track > max ? item.track : max;
    }, 0);

    // Clone the newTrackPattern and update the track number
    const newTrack = {
      ...newTrackPattern,
      track: maxTrackNumber + 1
    };
  
    data.push(newTrack); // Assuming data is an array
    const updatedRecipeData = JSON5.stringify(data, null, 2);
    handleAceChanges(updatedRecipeData);
  }

  const addClip = () => {
    setError(''); // Clear any previous error
    try {
      const { row, column } = editorRef.editor.getCursorPosition();
      const modifiedRecord = insertNewClipIntoJsonStr(
        recipeRecord.recipe_data, 
        row, 
        newClipPattern
      );
      console.log("addClip modifiedRecord", modifiedRecord);
      // Handle the success case, such as updating state or UI with modifiedRecord
      handleAceChanges(modifiedRecord);
    } catch (error) {
      console.error("Error adding new clip:", error);
      // Handle the error, such as displaying an error message to the user
      setError("Error adding new clip:", error.message);
    }
  }

  const Required = () => <span className="required">*</span>;

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label" htmlFor="title">Recipe Name: <Required /></label>
        <input className="form-field" type="text" id="title" name="title" value={recipeRecord.title} onChange={handleChange} />

        <label className="form-label" htmlFor="description">Description: <Required /></label>
        <textarea className="form-textarea" id="description" name="description" value={recipeRecord.description || ''} onChange={handleChange}></textarea>
        
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

      <div className="form-group pb-1">
        <label className="form-label" htmlFor="recipe_data">Recipe Data: <Required /></label>

        <AceEditor
          mode="json"
          theme="github"
          name="recipe_data"
          ref={(editor) => setEditorRef(editor)}
          className="code-editor"
          value={recipeRecord.recipe_data}
          onChange={handleAceChanges}
          editorProps={{ $blockScrolling: true }}
          setOptions={aceOptions}
          style={{ width: '', height: 'auto' }}
        />
        <div className="form-button-box">
          <button className="button left reset" type="button" onClick={reset}>Reset</button>
          <div className="form-button-right">
            <button className="button right" type="button" onClick={validate}>Validate</button>
            <button className="button right" type="button" onClick={addTrack}>Add Track</button>
            <button className="button right mr-0" type="button" onClick={addClip}>Add Clip</button>
          </div>
          </div><div className='message-box h-5 pt-0'>
            {successMessage && <div className="success">{successMessage}</div>}
            {error && <div className="error">{error}</div>}
          </div>
      </div>
  
      <div className="form-group">

        <label className="form-label" htmlFor="title">Category:</label>
        <div className="form-checkbox">
          {Object.entries(recipeRecord.classification).map(([key, value]) => (
            <div className="checkbox-field" key={key}>
              <input
                type="checkbox"
                id={key}
                name={key}
                checked={value}
                onChange={handleChange}
              />
              <label htmlFor={key}> {key}</label>
            </div>
          ))}
        </div>

        <label className="form-label" htmlFor="tags">Tags (comma-separated):</label>
        <input className="form-field" type="text" id="tags" name="tags" value={recipeRecord.tags} onChange={handleChange} />
        <p className="form-note">Separated with commas</p>
        
        <label className="form-label" htmlFor="comments">Comments:</label>
        <textarea className="form-textarea" id="comments" name="comments" value={recipeRecord.comments || ''} onChange={handleChange}></textarea>
      </div>
  
      <div className='button-box'>
        <button className='button cancel' type="button" onClick={onCancel}>Cancel</button>
        <button className='button submit' type="submit">Save Recipe</button>
      </div>
    </form>
  );
}

export default RecipeForm;
