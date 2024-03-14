// formUtil - utilities for form components

import React, { useState, useEffect } from 'react';
import { WithContext as ReactTags } from 'react-tag-input';

export const TagSelect = ({ options, onTagAddition, initialValues }) => {
  // Convert initialValues to the format expected by ReactTags
  const initialTags = (initialValues || []).map((value, index) => ({
    id: index.toString(),
    text: value
  }));

  const [tags, setTags] = useState(initialTags);
  const [selectedItem, setSelectedItem] = useState('');

  useEffect(() => {
    // Call onTagAddition with initial tags when the component mounts
    onTagAddition(ReactTagsToArray(tags));
  }, []) ; // Empty dependency array to run only once on mount

  // Convert the tags array to a simple array of strings
  function ReactTagsToArray(tags) {
    if (!tags) return [];
    return tags.map(tag => tag.text);
  }

  const handleDelete = (i) => {
    const updatedTags = tags.filter((tag, index) => index !== i);
    setTags(updatedTags);
    onTagAddition(ReactTagsToArray(updatedTags)); // Update parent component's state with new tags array
  };

  const handleAddition = (tag) => {
    const updatedTags = [...tags, tag];
    setTags(updatedTags);
    onTagAddition(ReactTagsToArray(updatedTags)); // Update parent component's state with new tags array
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
      onTagAddition(ReactTagsToArray(tags.concat(newTag))); // Update parent component's state
      setSelectedItem(''); // Reset selection after adding
    }
  };

  return (
    <div className="form-select flex gap-3">
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
          delimiters={[188, 13]} // Enter and comma keys as delimiters
          placeholder=""
          autofocus={false}
          classNames={{
            tags: 'react-tags',
            tagInput: 'react-tags__input',
            tagInputField: 'react-tags__input__field',
            selected: 'react-tags__selected',
            tag: 'react-tags__selected-tag',
            remove: 'icon react-tags__selected-tag__remove',
            suggestions: 'react-tags__suggestions',
            activeSuggestion: 'react-tags__suggestions__item--active'
          }}
        />
      </div>
    </div>
  );
};
