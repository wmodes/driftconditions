

import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-json5';
// import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/worker-json';
// import 'ace-builds/src-noconflict/theme-github';
import 'ace-builds/src-noconflict/theme-tomorrow';
import "ace-builds/src-noconflict/ext-language_tools";
import JSON5 from 'json5';
import _ from 'lodash';

import { insertNewElementIntoJsonStr } from '../utils/recipeUtils';
import { defineCustomEditorMode } from '../utils/editorUtils';
import { ClassificationCheckboxes, TagInput } from '../utils/formUtils';

import config from '../config/config';
// eslint-disable-next-line
import { set } from 'ace-builds/src-noconflict/ace';
const aceOptions = config.aceEditor;
const newTrackPattern = config.recipes.newTrack;
const newClipPattern = config.recipes.newClip;
const newSilencePattern = config.recipes.newSilence;

function RecipeForm({ action, initialRecord, onSave, onCancel, onChange }) {
  // get auth state from Redux store
  const { user: userAuth } = useSelector((state) => state.auth);
  const [editPerm, setEditPerm] = useState(false);

  // Check if the user has permission to edit recipes
  useEffect(() => {
    // Check if the user has permission to edit audio
    if (userAuth.permissions.indexOf('recipeEdit') !== -1) {
      // console.log('User has permission to edit recipes');
      setEditPerm(true);
    }
  }, [userAuth.permissions]);

  // State to hold the form data
  const [record, setRecord] = useState(initialRecord);
  // console.log("RecipeForm: initialRecord", initialRecord);
  // eslint-disable-next-line
  const [resetRecord, setResetRecord] = useState(
    JSON.parse(JSON.stringify(initialRecord || {}))
  );
  // store a ref to the editor API
  const [editorRef, setEditorRef] = useState(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [isJSONValid, setIsJSONValid] = useState(false);

  // State for handling loading, success, and error feedback
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (editorRef && editorRef.editor) {
      setIsEditorReady(true);
    }
  }, [editorRef]);

  // now that the editor is ready, define the custom mode
  useEffect(() => {
    if (isEditorReady) {
      const editor = editorRef.editor;
      defineCustomEditorMode(); // Ensure this function is correctly setting up the mode
      editor.session.setMode('ace/mode/custom_json'); // Apply the custom mode
      validateOnTheFly(record.recipeData); // Validate the initial content
    }
    // eslint-disable-next-line
  }, [isEditorReady]);

  // Local handleChange function updates local state and calls parent callback
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    // Construct the updatedRecord based on input type
    let updatedRecord;
    if (type === 'checkbox') {
      // Specifically handle classification checkboxes
      updatedRecord = {
        ...record,
        classification: { ...record.classification, [name]: checked },
      };
    } else {
      // Handle all other input types
      updatedRecord = { ...record, [name]: value };
    }
    // Update the record state with updatedRecord
    setRecord(updatedRecord);
    // Then call the onChange callback provided by the parent, if available
    if (onChange) {
      onChange(updatedRecord);
    }
  };

  const handleTagChange = (newTags) => {
    // Update recipeData directly within the local state
    const updatedRecord = { ...record, tags:newTags };
    setRecord(updatedRecord);

    // Then call the onChange callback provided by the parent, if available
    if (onChange) {
      onChange(updatedRecord);
    }
  };

  // Submit form - handle data massage in the calling component
  const handleSubmit = (event) => {
    event.preventDefault();
    onSave(record);
    // TODO: get the success message from the parent
  };

  const handleRecipeChanges = (newValue) => {
    // Update recipeData directly within the local state
    const updatedRecord = { ...record, recipeData: newValue };
    setRecord(updatedRecord);
    // Then call the onChange callback provided by the parent, if available
    if (onChange) {
      onChange(updatedRecord);
    }
    validateOnTheFly(newValue);
  };

  // Function to perform JSON5 validation and update UI accordingly
  const performValidation = (jsonData, updateSuccessMessage = false) => {
    try {
      JSON5.parse(jsonData);
      setIsJSONValid(true);
      setError('');
      if (updateSuccessMessage) setSuccessMessage('JSON5 is valid!');
      editorRef.editor.session.clearAnnotations();
    } catch (error) {
      setIsJSONValid(false);
      setError(`${error.message}`);
      setSuccessMessage('');
      
      const lineNumber = error.lineNumber - 1;
      const errorAnnotation = {
        row: lineNumber,
        column: 0, // Assuming all errors to be at the start of the line for simplicity
        text: error.message,
        type: "error",
      };
      editorRef.editor.session.setAnnotations([errorAnnotation]);
    }
  };

  // Debounce the on-the-fly validation function
  // eslint-disable-next-line
  const validateOnTheFly = useCallback(_.debounce((newValue) => {
    performValidation(newValue);
  }, 500), [editorRef]); // Assuming editorRef is stable and included if needed

  // Perform validation on specific call
  const validateOnCall = () => {
    performValidation(record.recipeData, true);
  };

  const reset = () => {
    // console.log("RecipeForm: resetRecord", resetRecord)
    setRecord(resetRecord);
  }

  // helper to parse JSON5 content
  function isValidJSON(content) {
    try {
      return JSON5.parse(content);
      return true;
    } catch (error) {
      console.error('Failed to parse content:', error);
      setError('Failed to parse content. Error in your JSON5 syntax.'); 
      return false; // Handle this error appropriately in your application
    }
  }

  const addTrack = () => {
    setError(''); // Clear any previous error
    const recipeData = record.recipeData;
    if (!isValidJSON(recipeData) || !Array.isArray(recipeData)) return; // Error parsing content  
    // Find the highest existing track number
    const maxTrackNumber = recipeData.reduce((max, item) => {
      return item.track && item.track > max ? item.track : max;
    }, 0);
    // Clone the newTrackPattern and update the track number
    const newTrack = {
      ...newTrackPattern,
      track: maxTrackNumber + 1
    };
    recipeData.push(newTrack); // Assuming data is an array
    const updatedRecipeData = JSON5.stringify(recipeData, null, 2);
    handleRecipeChanges(updatedRecipeData);
  }

  const addClip = (type=null) => {
    let newPattern;
    if (type === "silence") {
      newPattern = newSilencePattern;
      type = "silence";
    } else {
      newPattern = newClipPattern;
      type = "clip";
    }
    setError(''); // Clear any previous error
    try {
      const { row } = editorRef.editor.getCursorPosition();
      const modifiedRecord = insertNewElementIntoJsonStr(
        record.recipeData, 
        row, 
        newPattern
      );
      // console.log("addClip modifiedRecord", modifiedRecord);
      // Handle the success case, such as updating state or UI with modifiedRecord
      handleRecipeChanges(modifiedRecord);
    } catch (error) {
      console.error(`Error adding new ${type}:`, error);
      // Handle the error, such as displaying an error message to the user
      setError(`Error adding new ${type}:`, error.message);
    }
  }

  const addSilence = (type=null) => {
    addClip('silence');
  }

  const Required = () => <span className="required">*</span>;

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label" htmlFor="title">Recipe Name: <Required /></label>
        <input className="form-field" type="text" id="title" name="title" value={record.title} onChange={handleChange} />

        <label className="form-label" htmlFor="description">Description: <Required /></label>
        <textarea className="form-textarea" id="description" name="description" value={record.description || ''} onChange={handleChange}></textarea>
        
        {action!=="create" && (
          <>
            <div className="form-row">
              <span className="form-label">Created:</span>
              <span className="form-value">
                <Link to={`/recipe/list?filter=user&targetID=${record.creatorUsername}`}>
                  {record.creatorUsername}
                </Link>
                {" on " + record.createDate}
              </span>
            </div>

            {record.editorUsername && (
                <div className="form-row">
                  <span className="form-label">Edited:</span>
                  <span className="form-value">
                    <Link to={`/recipe/list?filter=user&targetID=${record.editorUsername}`}>
                      {record.editorUsername}
                    </Link>
                    {" on " + record.editDate}
                  </span>
                </div>
              )
            }
          </>
        )}
  
        <label className="form-label" htmlFor="status">Status:</label>
        <select name="status" value={record.status} onChange={handleChange} className="form-select">
          <option value="Review">Under Review</option>
          <option value="Approved"  disabled={!editPerm}>Approved</option>
          <option value="Disapproved"  disabled={!editPerm}>Disapproved</option>
          <option value="Trashed"  disabled={!editPerm}>Trashed</option>
        </select>
      </div>

      <div className="form-group pb-1">
        <label className="form-label" htmlFor="recipeData">Recipe Data: <Required /></label>

        <AceEditor
          mode="json"
          theme="tomorrow"
          name="recipeData"
          ref={(editor) => setEditorRef(editor)}
          className="code-editor"
          value={record.recipeData}
          onChange={handleRecipeChanges}
          editorProps={{ $blockScrolling: true }}
          setOptions={aceOptions}
          style={{ width: '', height: 'auto' }}
          fontSize="14px"
        />
        <div className="form-button-box">
          <button className="button left reset" type="button" onClick={reset}>Reset</button>
          <div className="form-button-right">
            <button className="button right" type="button" onClick={validateOnCall}>Validate</button>
            <button className="button right" type="button" onClick={addTrack}>Add Track</button>
            <button className="button right mr-0" type="button" onClick={addClip}>Insert Clip</button>
            <button className="button right mr-0" type="button" onClick={addSilence}>Insert Silence</button>
          </div>
          </div><div className='message-box h-5 pt-0'>
            {successMessage && <div className="success">{successMessage}</div>}
            {error && <div className="error">{error}</div>}
          </div>
      </div>
  
      <div className="form-group">

        <label className="form-label" htmlFor="title">Category:</label>
        {record?.classification !== undefined && (     
          <ClassificationCheckboxes
            classification={record.classification}
            handleChange={handleChange}
          />
        )}

        <label className="form-label" htmlFor="tags">Tags:</label>
        {record?.tags !== undefined && (        
          <TagInput
            initialTags={record.tags}
            onTagChange={handleTagChange}
          />
        )}
        
        <label className="form-label" htmlFor="comments">Comments:</label>
        <textarea className="form-textarea" id="comments" name="comments" value={record.comments || ''} onChange={handleChange}></textarea>
      </div>
  
      <div className='button-box'>
        <button className='button cancel' type="button" onClick={onCancel}>Cancel</button>
        <button className='button submit' type="submit" disabled={!isJSONValid}>Save Recipe</button>
      </div>
    </form>
  );
}

export default RecipeForm;
