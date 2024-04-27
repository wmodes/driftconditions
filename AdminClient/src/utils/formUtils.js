// formUtil - utilities for form components

import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { setUnsavedChanges } from '../store/formSlice';
import { WithContext as ReactTags } from 'react-tag-input';
import { normalizeTag } from './formatUtils';

// Function to track unsaved changes and handle navigation
export const useUnsavedChangesEvents = () => {
  const dispatch = useDispatch();
  const unsavedChanges = useSelector(state => state.form.unsavedChanges);
  console.log('formUtils:useUnsavedChanges:unsavedChanges', unsavedChanges);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      console.log('formUtils:useUnsavedChanges:handleBeforeUnload:unsavedChanges', unsavedChanges);
      if (unsavedChanges) {
        // Display confirmation dialog
        const confirmMessage = 'You have unsaved changes. Are you sure you want to leave?';
        const confirmed = window.confirm(confirmMessage);
        if (!confirmed) {
          // Prevent the default action (navigation)
          event.preventDefault();
          // Set a custom message for the dialog
          event.returnValue = confirmMessage;
          return confirmMessage;
        }
      }
    };
    // Add event listener for beforeunload
    window.addEventListener('beforeunload', handleBeforeUnload);

    const handleUnloadConfirmation = () => {
      // Reset unsavedChanges if the user chooses to continue
      if (unsavedChanges) {
        dispatch(setUnsavedChanges(false));
      }
    };
    // Add event listener for unload
    window.addEventListener('unload', handleUnloadConfirmation);

    // Cleanup function to remove event listeners
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnloadConfirmation);
    };
  }, [unsavedChanges, dispatch]);
};

// Function to handle navigation
export const useSafeNavigate = () => { 
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const unsavedChanges = useSelector(state => state.form.unsavedChanges);
  
  const handleSafeNavigation = (path) => {
    console.log('formUtils:useSafeNavigation:path', path);
    if (!unsavedChanges || window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
      // Set unsavedChanges to false if user chooses to continue
      if (unsavedChanges) {
        dispatch(setUnsavedChanges(false));
      }
      navigate(path);
    }
  };
  return handleSafeNavigation;
};

// SafeLink component to handle navigation with unsaved changes
export const SafeLink = ({ to, children }) => {
  const safeNavigate = useSafeNavigate();
  
  const handleClick = (event) => {
    event.preventDefault();
    safeNavigate(to);
  };

  return <Link to={to} onClick={handleClick}>{children}</Link>;
};

// provide a dropdown list of tags to select from
//
export const TagSelect = ({ options, onTagChange, initialValues }) => {
  // Convert initialValues to the format expected by ReactTags
  const initialTags = arrayToReactTags(initialValues);

  const [tags, setTags] = useState(initialTags);
  const [selectedItem, setSelectedItem] = useState('');

  useEffect(() => {
    // Call onTagAddition with initial tags when the component mounts
    onTagChange(ReactTagsToArray(tags));
  }, []) ; // Empty dependency array to run only once on mount

  const handleDelete = (i) => {
    const updatedTags = tags.filter((tag, index) => index !== i);
    setTags(updatedTags);
    onTagChange(ReactTagsToArray(updatedTags)); // Update parent component's state with new tags array
  };

  const handleAddition = (tag) => {
    const updatedTags = [...tags, tag];
    setTags(updatedTags);
    onTagChange(ReactTagsToArray(updatedTags)); // Update parent component's state with new tags array
  };

  const handleChange = (event) => {
    setSelectedItem(event.target.value);
  };

  const handleAddClick = (event) => {
    event.stopPropagation(); // Stop the event from bubbling up
    if (selectedItem) {
      // Ensure the new tag's ID is a string
      const newTagId = (tags.length + 1).toString();
      const newTag = { id: newTagId, text: selectedItem };
      handleAddition(newTag);
      onTagChange(ReactTagsToArray(tags.concat(newTag))); // Update parent component's state
      setSelectedItem(''); // Reset selection after adding
    }
  };

  return (
    <div className="form-tags select flex gap-3">
      <div className="flex flex-col">
        <div className="select-list">
          <select value={selectedItem} onChange={handleChange} className="select-dropdown">
            <option value="" disabled>Select One</option>
            {options.map((option, index) => (
              <option key={index} value={option}>{option}</option>
            ))}
          </select>
        </div>
        <div className="select-add">
          <button type="button" onClick={handleAddClick} className="add-button">New</button>
        </div>
      </div>
      <div className="select-results flex-grow">
        <ReactTags
          tags={tags}
          handleDelete={handleDelete}
          handleAddition={handleAddition}
          delimiters={[188, 13, ',']} // Enter and comma keys as delimiters
          placeholder=""
          autofocus={false}
          classNames={{
            tags: 'react-tags',
            tagInput: 'react-tags-input',
            tagInputField: 'react-tags-input-field',
            selected: 'react-tags-selected',
            tag: 'react-tags-selected-tag',
            remove: 'icon react-tags-selected-tag-remove',
            suggestions: 'react-tags-suggestions',
            activeSuggestion: 'react-tags-suggestions-item--active'
          }}
        />
      </div>
    </div>
  );
};

export const TagInput = ({ onTagChange, initialTags }) => {
  // Convert initialValues to the format expected by ReactTags
  const convertedTags = arrayToReactTags(initialTags);

  const [tags, setTags] = useState(convertedTags);
  const inputRef = useRef(null); // Create a ref for the input field

  useEffect(() => {
    // Call onTagChange with initial tags when the component mounts
    // onTagChange(ReactTagsToArray(tags));
  }, []); // Empty dependency array to run only once on mount

  // make sure that when we click in the select-results div, the input field is focused
  useEffect(() => {
    const handleClick = (event) => {
      // Look for the .react-tags-input-field within .select-results
      const inputField = document.querySelector('.select-results .react-tags-input-field');
      if (inputField) {
        inputField.focus();
      }
    };
    // Add event listener to the .select-results div
    const selectResultsDiv = document.querySelector('.select-results');
    if (selectResultsDiv) {
      selectResultsDiv.addEventListener('click', handleClick);
    }
    // Cleanup to remove event listener
    return () => {
      if (selectResultsDiv) {
        selectResultsDiv.removeEventListener('click', handleClick);
      }
    };
  }, []); // Ensure this effect runs only once

  const handleDelete = (i) => {
    const updatedTags = tags.filter((tag, index) => index !== i);
    setTags(updatedTags);
    onTagChange(ReactTagsToArray(updatedTags));
  };

  const handleAddition = (newTag) => {
    const updatedTags = [...tags, NormalizeReactTag(newTag)];
    setTags(updatedTags);
    onTagChange(ReactTagsToArray(updatedTags));
  };

  return (
    <div className="form-tags input">
      <div className="select-results">
        {/* Ensure ReactTags component passes the inputRef to the actual input element */}
        {/* <div>{formatTagsAsString(ReactTagsToArray(tags))}</div> */}
        <ReactTags
          tags={tags}
          handleDelete={handleDelete}
          handleAddition={handleAddition}
          delimiters={[188, 13]}
          placeholder=""
          autofocus={false}
          classNames={{
            tags: 'react-tags',
            tagInput: 'react-tags-input',
            tagInputField: 'react-tags-input-field',
            selected: 'react-tags-selected',
            tag: 'react-tags-selected-tag',
            remove: 'icon react-tags-selected-tag-remove',
            suggestions: 'react-tags-suggestions',
            activeSuggestion: 'react-tags-suggestions-item--active'
          }}
        />
      </div>
    </div>
  );
};

export const ClassificationCheckboxes = ({ classification, handleChange }) => {
  return (
    <div className="form-checkbox">
      {Object.entries(classification).map(([key, value]) => (
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
  );
};

//
// Helpers
//
function ReactTagsToArray(tagObj) {
  if (!tagObj) return [];
  return tagObj.map(tag => tag.text);
}

function arrayToReactTags(tagsArray) {
  if (!tagsArray || !Array.isArray(tagsArray)) return [];
  return tagsArray.map((tag, index) => ({
    id: tag, 
    text: tag 
  }));
}

function NormalizeReactTag(tag) {
  return {
    id: normalizeTag(tag.text),
    text: normalizeTag(tag.text)
  };
}
