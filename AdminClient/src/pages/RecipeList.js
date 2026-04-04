// RecipeList.js - Edit recipe details

// TODO: Add search field

import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { recipeList as recipeListAction, recipeTrash as recipeTrashAction, recipeUpdate } from '../store/recipeSlice';
import { parseQuery, stringifyQuery } from '../utils/queryUtils';
import { renderPagination } from '../utils/listUtils'; 
import { formatDateAsFriendlyDate, formatListAsString } from '../utils/formatUtils';

// TODO: test and debug user filter

// Import the config object from the config.js file
import config from '../config/config';
// pull variables from the config object
const recordsPerPage = config.list.recordsPerPage;
const retryLimit = config.adminServer.retryLimit;

function RecipeList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  // Local state for managing recipe list and pagination
  const [recipeList, setRecipeList] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);

  // Success and error handling
  const [isLoading, setIsLoading] = useState(true);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  // Quick edit state
  const [editRecipeID, setEditRecipeID] = useState(null);
  const [editedRecord, setEditedRecord] = useState({});
  const [updateTrigger, setUpdateTrigger] = useState(false);

  // Parse current URL search params
  const currentFilters = parseQuery(location.search);

  const getCurrentQueryParams = () => {
    const searchParams = new URLSearchParams(location.search);
    return {
      page: parseInt(searchParams.get('page') || '1', 10),
      sort: searchParams.get('sort') || 'date',
      order: searchParams.get('order') || 'DESC',
      filter: searchParams.get('filter') || 'all',
    };
  };

  useEffect(() => {
    if (retryAttempt >= retryLimit) return;
    setIsLoading(true); // Start loading
  
    // Directly extract params from URL each time the effect runs
    const queryParams = getCurrentQueryParams();
  
    dispatch(recipeListAction({queryParams}))
      .unwrap()
      .then(response => {
        setRecipeList(response.recipeList || []);
        setTotalRecords(response.totalRecords);
        setIsLoading(false); // Stop loading once data is fetched
      })
      .catch(error => {
        console.error("Error fetching recipe list:", error);
        setError(error || 'Failed to fetch recipe list.');
        setRecipeList([]);
        setIsLoading(false); // Stop loading on error
        setRetryAttempt(prevAttempt => prevAttempt + 1); // Increment retry attempt
      });
  // Only dependency is location.search to react to changes in search parameters
  // eslint-disable-next-line
  }, [dispatch, location.search, retryAttempt, updateTrigger]);

  const recipeTrash = async (recipeID) => {
    dispatch(recipeTrashAction({ recipeID }))
      .unwrap()
      .then(() => {
        setSuccessMessage(`Recipe ${recipeID} deleted successfully.`);
        const queryParams = getCurrentQueryParams();
        // console.log('queryParams:', queryParams);
        // Rerender the list by fetching updated data
        dispatch(recipeListAction({queryParams}))
        .unwrap()
        .then(response => {
          // console.log('response:', response);
          // console.log('response.audioList:', response.audioList, 'response.totalRecords:', response.totalRecords);
          setRecipeList(response.recipeList || []);
          setTotalRecords(response.totalRecords);
        })
        .catch(error => {
          console.error("Error fetching updated recipe list:", error);
          setError(error || 'Failed to fetch updated recipe list.');
        });
      })
      .catch(error => {
        console.error("Error trashing recipe:", error);
        setError(error || 'Failed to trash recipe.'); // Update error state
      });
  };

  const handleSort = (newSort, newOrder = 'DESC') => {
    const searchParams = new URLSearchParams(location.search);
    newSort && searchParams.set('sort', newSort);
    newOrder && searchParams.set('order', newOrder);
    navigate(`${location.pathname}?${searchParams.toString()}`);
  };
  
  const handleFilter = (newFilter, targetID = null) => {
    const searchParams = new URLSearchParams(location.search);
    if (newFilter === 'all') {
      searchParams.delete('filter');
    } else {
      searchParams.set('filter', newFilter);
      if (newFilter === 'user' && targetID) {
        searchParams.set('targetID', targetID);
      } else {
        searchParams.delete('targetID');
      }
    }
    navigate(`${location.pathname}?${searchParams.toString()}`);
  };

  const openEditRow = (recipe) => {
    setEditRecipeID(editRecipeID === recipe.recipeID ? null : recipe.recipeID);
    setEditedRecord(recipe);
  };

  const handleQuickEditSubmit = async (e) => {
    e.preventDefault();
    await dispatch(recipeUpdate({ recipeRecord: editedRecord }))
      .unwrap()
      .then(() => {
        setSuccessMessage('Recipe updated successfully');
        setError('');
        setEditRecipeID(null);
        setUpdateTrigger(prev => !prev);
      })
      .catch(error => {
        console.error("Error updating recipe:", error);
        setSuccessMessage('');
        setError(error || 'Failed to update recipe.');
      });
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    const newQueryParams = { ...currentFilters, page: newPage };
    navigate({ search: stringifyQuery(newQueryParams) }); // Update URL without reloading the page
    setSuccessMessage('');
    setError('');
  };

  // Function to render controls
  const renderFilters = () => {
    return (                
      <div className="filter-box">
        <ul>
          <li>
            <button className="link" onClick={() => handleFilter('all')}>
              All
            </button>
          </li>
          <li>
            <button className="link" onClick={() => handleFilter('review')}>
              Review
            </button>
          </li>
          <li>
            <button className="link" onClick={() => handleFilter('approved')}>
              Approved
            </button>
          </li>
          <li>
            <button className="link" onClick={() => handleFilter('disapproved')}>
              Disapproved
            </button>
          </li>
          <li>
            <button className="link" onClick={() => handleFilter('trash')}>
              Trash
            </button>
          </li>
        </ul>
      </div>
    );
  };

  return (
    <div className="list-wrapper">
      <div className="display-box-wrapper">
        <div className="display-box">
          <h2 className='title'>Recipe List</h2>
          <div className='message-box'>
            {isLoading && <p className="success">Loading...</p>}
            {successMessage && <p className="success">{successMessage}</p>}
            {error && <p className="error">{error}</p>}
          </div>
          {!error && !isLoading ? (
            <div>
              <div className="top-controls">
                {renderFilters()}
                {renderPagination(totalRecords, recordsPerPage, page, handlePageChange)}
              </div>
              <table className="recipe-table big-table">
                <thead>
                  <tr>
                    <th className="id">
                      <button className="link" onClick={() => handleSort('id', 'ASC')}>
                        ID
                      </button>
                    </th>
                    <th className="name">
                      <button className="link" onClick={() => handleSort('title', 'ASC')}>
                        Title
                      </button>
                    </th>
                    <th className="creator">
                      <button className="link" onClick={() => handleSort('author', 'ASC')}>
                        Author
                      </button> / 
                      <button className="link" onClick={() => handleSort('date', 'DESC')}>
                         Date
                      </button>
                    </th>
                    <th className="description">Description</th>
                    <th className="status">
                      <button className="link" onClick={() => handleSort('status', 'DESC')}>
                        Status
                      </button>
                    </th>
                    <th className="classification">Classification</th>
                    <th className="tags">Tags</th>
                  </tr>
                </thead>
                <tbody>
                  {recipeList.map((recipe, index) => (
                    <React.Fragment key={recipe.recipeID}>
                      <tr className={index % 2 === 0 ? 'row-even' : 'row-odd'}>
                        <td className="id">{recipe.recipeID}</td>
                        <td className="name">
                          {recipe.title}
                          <div>
                            <ul className="action-list">
                              <li><Link to={`/recipe/view/${recipe.recipeID}`}>View</Link></li>
                              <li><Link to={`/recipe/edit/${recipe.recipeID}`}>Edit</Link></li>
                              <li><button className="link" onClick={() => openEditRow(recipe)}>Quick Edit</button></li>
                              <li><button className="link" onClick={() => recipeTrash(recipe.recipeID)}>Trash</button></li>
                            </ul>
                          </div>
                        </td>
                        <td className="author">
                          <div className="authorline">
                            Upload:&nbsp;
                            <button className="link"
                              onClick={() => handleFilter('user', recipe.creatorUsername)}>
                              {recipe.creatorUsername}
                            </button>
                            &nbsp;on {formatDateAsFriendlyDate(recipe.createDate)}
                          </div>
                          {recipe.editorUsername && (
                            <div className="authorline">
                              Edit:&nbsp;
                              <button className="link"
                                onClick={() => handleFilter('user', recipe.editorUsername)}>
                                {recipe.editorUsername}
                              </button>
                              &nbsp;on {formatDateAsFriendlyDate(recipe.editDate)}
                            </div>
                          )}
                        </td>
                        <td className="description">{recipe.description}</td>
                        <td className="status">{recipe.status}</td>
                        <td className="classification">{formatListAsString(recipe.classification)}</td>
                        <td className="tags">{formatListAsString(recipe.tags)}</td>
                      </tr>
                      {/* quick edit row */}
                      {editRecipeID === recipe.recipeID && (
                        <tr className={`${index % 2 === 0 ? 'row-even' : 'row-odd'} quick-edit`}>
                          <td colSpan="7">
                            <div className="form-group">
                              <form onSubmit={handleQuickEditSubmit}>
                                <div className="space-y-1">
                                  <div className="flex items-center space-x-2">
                                    <label className="block text-sm font-medium text-gray-700" htmlFor="title">Title:</label>
                                    <input
                                      type="text"
                                      name="title"
                                      value={editedRecord.title || ''}
                                      onChange={(e) => setEditedRecord({ ...editedRecord, title: e.target.value })}
                                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
                                    />
                                  </div>
                                  <div className="flex items-center space-x-4">
                                    <div className="flex items-center space-x-2 flex-none">
                                      <label className="block text-sm font-medium text-gray-700" htmlFor="status">Status:</label>
                                      <select
                                        name="status"
                                        value={editedRecord.status || ''}
                                        onChange={(e) => setEditedRecord({ ...editedRecord, status: e.target.value })}
                                        className="mt-1 block rounded-md border-gray-300 shadow-sm sm:text-sm"
                                      >
                                        <option value="Review">Review</option>
                                        <option value="Approved">Approved</option>
                                        <option value="Disapproved">Disapproved</option>
                                        <option value="Trashed">Trashed</option>
                                      </select>
                                    </div>
                                    <div className="flex items-center space-x-2 flex-grow">
                                      <label className="block text-sm font-medium text-gray-700" htmlFor="classification">Classification:</label>
                                      <input
                                        type="text"
                                        name="classification"
                                        value={editedRecord.classification || ''}
                                        onChange={(e) => setEditedRecord({ ...editedRecord, classification: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
                                      />
                                    </div>
                                    <div className="flex items-center space-x-2 flex-grow">
                                      <label className="block text-sm font-medium text-gray-700" htmlFor="tags">Tags:</label>
                                      <input
                                        type="text"
                                        name="tags"
                                        value={editedRecord.tags || ''}
                                        onChange={(e) => setEditedRecord({ ...editedRecord, tags: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <label className="block text-sm font-medium text-gray-700" htmlFor="description">Description:</label>
                                    <textarea
                                      name="description"
                                      value={editedRecord.description || ''}
                                      onChange={(e) => setEditedRecord({ ...editedRecord, description: e.target.value })}
                                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
                                    />
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <label className="block text-sm font-medium text-gray-700" htmlFor="comments">Comments:</label>
                                    <textarea
                                      name="comments"
                                      value={editedRecord.comments || ''}
                                      onChange={(e) => setEditedRecord({ ...editedRecord, comments: e.target.value })}
                                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
                                    />
                                  </div>
                                  <div className="flex justify-end">
                                    <button className="bg-blue-500 text-white rounded-md py-2 px-4 hover:bg-blue-600" type="submit">
                                      Update
                                    </button>
                                  </div>
                                </div>
                              </form>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
              <div className="bottom-controls">
                {renderFilters()}
                {renderPagination(totalRecords, recordsPerPage, page, handlePageChange)}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default RecipeList;
