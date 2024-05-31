// formUtil - utilities for form components

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { setUnsavedChanges } from '../store/formSlice';
import { WithContext as ReactTags } from 'react-tag-input';
import { normalizeTag } from './formatUtils';
import { Tooltip } from 'react-tooltip';
import FeatherIcon from 'feather-icons-react';

// Import the config object from the config.js file
import config from '../config/config'; 
// pull variables from the config object
const classificationFields = config.audio.classificationFields;

/**
 * Custom hook to track unsaved changes and handle navigation.
 */
export const useUnsavedChangesEvents = () => {
  const dispatch = useDispatch();
  const unsavedChanges = useSelector(state => state.form.unsavedChanges);
  // console.log('formUtils:useUnsavedChanges:unsavedChanges', unsavedChanges);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      // console.log('formUtils:useUnsavedChanges:handleBeforeUnload:unsavedChanges', unsavedChanges);
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

/**
 * Custom hook to handle navigation with unsaved changes.
 * @returns {function} - A function to navigate safely.
 */
export const useSafeNavigate = () => { 
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const unsavedChanges = useSelector(state => state.form.unsavedChanges);
  
  /**
   * Handles safe navigation.
   * @param {string} path - The path to navigate to.
   */
  const handleSafeNavigation = (path) => {
    // console.log('formUtils:useSafeNavigation:path', path);
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

/**
 * SafeLink component to handle navigation with unsaved changes.
 * @param {Object} props - The props object.
 * @param {string} props.to - The destination path.
 * @param {React.ReactNode} props.children - The children nodes.
 * @returns {JSX.Element} - The SafeLink component.
 */
export const SafeLink = ({ to, children }) => {
  const safeNavigate = useSafeNavigate();
  
  /**
   * Handles click event.
   * @param {Object} event - The click event.
   */
  const handleClick = (event) => {
    event.preventDefault();
    safeNavigate(to);
  };

  return <Link to={to} onClick={handleClick}>{children}</Link>;
};

/**
 * TagSelect component to provide a dropdown list of tags to select from.
 * @param {Object} props - The props object.
 * @param {Array} props.options - The available tag options.
 * @param {function} props.onTagChange - The function to call when tags change.
 * @param {Array} props.initialValues - The initial selected tag values.
 * @returns {JSX.Element} - The TagSelect component.
 */
export const TagSelect = ({ options, onTagChange, initialValues }) => {
  // Convert initialValues to the format expected by ReactTags
  const initialTags = arrayToReactTags(initialValues);

  const [tags, setTags] = useState(initialTags);
  const [selectedItem, setSelectedItem] = useState('');

  useEffect(() => {
    // Call onTagAddition with initial tags when the component mounts
    onTagChange(ReactTagsToArray(tags));
  // eslint-disable-next-line
  }, []) ; // Empty dependency array to run only once on mount

  /**
   * Handles deleting a tag.
   * @param {number} i - The index of the tag to delete.
   */
  const handleDelete = (i) => {
    const updatedTags = tags.filter((tag, index) => index !== i);
    setTags(updatedTags);
    onTagChange(ReactTagsToArray(updatedTags)); // Update parent component's state with new tags array
  };

  /**
   * Handles adding a new tag.
   * @param {Object} tag - The new tag to add.
   */
  const handleAddition = (tag) => {
    const updatedTags = [...tags, tag];
    setTags(updatedTags);
    onTagChange(ReactTagsToArray(updatedTags)); // Update parent component's state with new tags array
  };

  /**
   * Handles changing the selected item.
   * @param {Object} event - The change event.
   */
  const handleChange = (event) => {
    setSelectedItem(event.target.value);
  };

  /**
   * Handles adding the selected item as a new tag.
   * @param {Object} event - The click event.
   */
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

/**
 * TagInput component to handle tag input.
 * @param {Object} props - The props object.
 * @param {function} props.onTagChange - The function to call when tags change.
 * @param {Array} props.initialTags - The initial tags.
 * @returns {JSX.Element} - The TagInput component.
 */
export const TagInput = ({ onTagChange, initialTags }) => {
  // Convert initialValues to the format expected by ReactTags
  const convertedTags = arrayToReactTags(initialTags);

  const [tags, setTags] = useState(convertedTags);
  // const inputRef = useRef(null); // Create a ref for the input field

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

  /**
   * Handles deleting a tag.
   * @param {number} i - The index of the tag to delete.
   */
  const handleDelete = (i) => {
    const updatedTags = tags.filter((tag, index) => index !== i);
    setTags(updatedTags);
    onTagChange(ReactTagsToArray(updatedTags));
  };

  /**
   * Handles adding a new tag.
   * @param {Object} newTag - The new tag to add.
   */
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

/**
 * InfoButton component to display an information button with a tooltip.
 * @param {Object} props - The props object.
 * @param {string} props.infoText - The text to display in the tooltip.
 * @param {string} props.id - The id for the tooltip.
 * @returns {JSX.Element} - The InfoButton component.
 */
export const InfoButton = ({ infoText, id }) => {
  return (
    <span 
      tabIndex="-1" 
      className="info-button non-selectable pointer-enabled"
      onMouseDown={(e) => e.preventDefault()} // Prevent focus on mouse down
    >
      <FeatherIcon icon="help-circle" data-tooltip-id={id} data-tooltip-content={infoText  } />
      <Tooltip id={id} 
        delayShow={250}
        delayHide={250}
      />
    </span>
  );
};

/**
 * ClassificationCheckboxes component to render a list of checkboxes for classification fields.
 * @param {Object} props - The props object.
 * @param {Object} props.classification - The classification object with boolean values.
 * @param {function} props.handleChange - The function to call when a checkbox value changes.
 * @returns {JSX.Element} - The ClassificationCheckboxes component.
 */
export const ClassificationCheckboxes = ({ classification, handleChange }) => {
  // Convert keys in classification object to lowercase
  const lowerCaseClassification = convertKeysToLowercase(classification);

  console.log('ClassificationCheckboxes:classification', lowerCaseClassification);

  return (
    <div className="form-checkbox">
      {classificationFields.map(field => (
        <div className="checkbox-field" key={field.value}>
          <input
            type="checkbox"
            id={field.value}
            name={field.value}
            checked={lowerCaseClassification[field.value] || false}
            onChange={handleChange}
          /> <label htmlFor={field.value}>
            {field.label}
          </label>
          <InfoButton infoText={field.moreInfo} id={`info-${field.value}`} />
        </div>
      ))}
    </div>
  );
};

/**
 * Converts an array of React tags to an array of strings.
 * @param {Array} tagObj - The array of React tags.
 * @returns {Array} - The array of strings.
 */
function ReactTagsToArray(tagObj) {
  if (!tagObj) return [];
  return tagObj.map(tag => tag.text);
}

/**
 * Converts an array of strings to an array of React tags.
 * @param {Array} tagsArray - The array of strings.
 * @returns {Array} - The array of React tags.
 */
function arrayToReactTags(tagsArray) {
  if (!tagsArray || !Array.isArray(tagsArray)) return [];
  return tagsArray.map((tag, index) => ({
    id: tag, 
    text: tag 
  }));
}

/**
 * Normalizes a React tag.
 * @param {Object} tag - The React tag.
 * @returns {Object} - The normalized React tag.
 */
function NormalizeReactTag(tag) {
  return {
    id: normalizeTag(tag.text),
    text: normalizeTag(tag.text)
  };
}

/**
 * Converts the keys of an object to lowercase.
 * @param {Object} obj - The object to convert.
 * @returns {Object} - The object with lowercase keys.
 */
const convertKeysToLowercase = (obj) => {
  return Object.keys(obj).reduce((acc, key) => {
    acc[key.toLowerCase()] = obj[key];
    return acc;
  }, {});
};
