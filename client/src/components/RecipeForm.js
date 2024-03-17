

import React, { useState, useEffect } from 'react';

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
    // Prepare the tags for submission if necessary (e.g., converting from string to array)
    const submissionData = {
      ...recipeRecord,
    };
    onSave(submissionData);
  };

  const Required = () => <span className="required">*</span>;

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label" htmlFor="recipe_name">Recipe Name: <Required /></label>
        <input className="form-field" type="text" id="recipe_name" name="recipe_name" value={recipeRecord.recipe_name} onChange={handleChange} />

        <label className="form-label" htmlFor="description">Description: <Required /></label>
        <textarea className="form-textarea" id="description" name="description" value={recipeRecord.description} onChange={handleChange}></textarea>
  
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
        <textarea className="form-textarea" id="recipe_data" name="recipe_data" value={recipeRecord.recipe_data} onChange={handleChange}></textarea>
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
