// formUtil - utilities for form components

import React, { useState } from 'react';

export const SelectList = ({ options, onAdd }) => {
  const [selectedItem, setSelectedItem] = useState('');

  const handleChange = (event) => {
    setSelectedItem(event.target.value);
  };

  const handleAdd = (event) => {
    event.stopPropagation(); // Prevent event from propagating to parent elements
    if (selectedItem) {
      onAdd(selectedItem);
      setSelectedItem(''); // Reset selection
    }
  };

  return (
    <div>
      <div className="select-list">
        <select value={selectedItem} onChange={handleChange} className="select-dropdown">
          <option value="" disabled>Select One</option>
          {options.map((option, index) => (
            <option key={index} value={option}>{option}</option>
          ))}
        </select>
      </div>
      <div className="select-add">
        <button type="button" onClick={handleAdd} className="add-button">Add</button>
      </div>
    </div>
  );
};