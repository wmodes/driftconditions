// FilterEditor.js - A component for editing a filter chain

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-json5';
import 'ace-builds/src-noconflict/worker-json';
import 'ace-builds/src-noconflict/theme-tomorrow';
import "ace-builds/src-noconflict/ext-language_tools";
import JSON5 from 'json5';
import _ from 'lodash';

import config from '../config/config';
import { set } from 'ace-builds/src-noconflict/ace';
const aceOptions = config.aceEditor;

function FilterEditor({ action, initFilterChain, onSave, onCancel, onChange }) {
  // State to hold the form data
  const [filterChain, setFilterChain] = useState(initFilterChain);
  const [resetFilterChain, setResetFilterChian] = useState(
    JSON.parse(JSON.stringify(initFilterChain || {}))
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
      // defineCustomEditorMode(); // Ensure this function is correctly setting up the mode
      // editor.session.setMode('ace/mode/custom_json'); // Apply the custom mode
      validateOnTheFly(filterChain); // Validate the initial content
    }
  }, [isEditorReady]);

  // Local handleChange function updates local state and calls parent callback
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    // Construct the updatedRecord based on input type
    let updatedFilter;
    // Handle all input types
    updatedFilter = { ...filterChain, [name]: value };
    // Update the record state with updatedRecord
    setFilterChain(updatedFilter);
    // Then call the onChange callback provided by the parent, if available
    if (onChange) {
      onChange(updatedFilter);
    }
  };

  // Submit form - handle data massage in the calling component
  const handleSubmit = (event) => {
    event.preventDefault();
    onSave(filterChain);
    // TODO: get the success message from the parent
  };

  const handleFilterChanges = (newValue) => {
    // Update filter directly within the local state
    const updatedFilter = { ...filterChain,newValue };
    setFilterChain(updatedFilter);
    // Then call the onChange callback provided by the parent, if available
    if (onChange) {
      onChange(updatedFilter);
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
  const validateOnTheFly = useCallback(_.debounce((newValue) => {
    performValidation(newValue);
  }, 500), [editorRef]); // Assuming editorRef is stable and included if needed

  // Perform validation on specific call
  const validateOnCall = () => {
    performValidation(filterChain, true);
  };

  const reset = () => {
    // console.log("RecipeForm: resetRecord", resetRecord)
    setFilterChain(resetFilterChain);
  }

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

  return (
    <form onSubmit={handleSubmit}>

      <div className="form-group pb-1">
        <label className="form-label" htmlFor="filterChain">FilterChain: </label>

        <AceEditor
          mode="json5"
          theme="tomorrow"
          name="filterEditor"
          ref={(editor) => setEditorRef(editor)}
          className="code-editor"
          value={filterChain}
          onChange={handleFilterChanges}
          editorProps={{ $blockScrolling: true }}
          setOptions={aceOptions}
          style={{ width: '', height: 'auto' }}
          fontSize="14px"
        />
        <div className="form-button-box">
          <button className="button left reset" type="button" onClick={reset}>Reset</button>
          <div className="form-button-right">
            <button className="button right ml-1" type="button" onClick={validateOnCall}>Validate</button>
            <button className="button right ml-1" type="submit">Run Test</button>
          </div>
          </div><div className='message-box h-5 pt-0'>
            {successMessage && <div className="success">{successMessage}</div>}
            {error && <div className="error">{error}</div>}
          </div>
      </div>
    </form>
  );
}

export default FilterEditor;
