// UserList.js - List user details

// Import necessary hooks and utilities
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { userList as userListAction, userDisable as userDisableAction, profileEdit } from '../store/userSlice';
import { parseQuery, stringifyQuery } from '../utils/queryUtils';
import { renderPagination } from '../utils/listUtils';
import { formatDateAsFriendlyDate } from '../utils/formatUtils';

import FeatherIcon from 'feather-icons-react';

// Import the config object
import config from '../config/config';
// Pull variables from the config object
const recordsPerPage = config.list.recordsPerPage;
const retryLimit = config.adminServer.retryLimit;

function UserList() {
  // Use existing hooks and state setup
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const [isLoading, setIsLoading] = useState(true);
  const [userList, setUserList] = useState([]); // Adapted for user data
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);

  // Adapt error handling and URL search params parsing
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [criticalError, setCriticalError] = useState('');

  const [editUserID, setEditUserID] = useState(null);
  const [editedRecord, setEditedRecord] = useState({});
  const [updateTrigger, setUpdateTrigger] = useState(false);

  // Search input state — initialized from URL and kept in sync with URL changes
  const [searchInput, setSearchInput] = useState(() => new URLSearchParams(location.search).get('search') || '');
  useEffect(() => {
    setSearchInput(new URLSearchParams(location.search).get('search') || '');
  }, [location.search]);

  const currentFilters = parseQuery(location.search);

  const getCurrentQueryParams = () => {
    const searchParams = new URLSearchParams(location.search);
    return {
      page: parseInt(searchParams.get('page') || '1', 10),        // default to page 1
      recordsPerPage: parseInt(searchParams.get('recordsPerPage') || config.list.recordsPerPage, 10), // default records per page
      sort: searchParams.get('sort') || 'date',
      order: searchParams.get('order') || 'DESC',
      filter: searchParams.get('filter') || 'all',
      role: searchParams.get('role'),
      search: searchParams.get('search') || '',
    };
  };

  useEffect(() => {
    if (retryAttempt >= retryLimit) return;
    setIsLoading(true);
  
    // Directly extract params from URL each time the effect runs
    const queryParams = getCurrentQueryParams();

    dispatch(userListAction({queryParams}))
      .unwrap()
      .then(response => {
        setUserList(response.userList);
        setTotalRecords(response.totalRecords);
        setIsLoading(false);
      })
      .catch(error => {
        console.error("Error fetching user list:", error);
        setCriticalError(error || 'Failed to fetch user list.');
        setUserList([]);
        setIsLoading(false);
        setRetryAttempt(prevAttempt => prevAttempt + 1);
      });
  }, [dispatch, location.search, retryAttempt, updateTrigger]);

  // Adapt handlePageChange, handleSort, and handleFilter for user data
  // These functions can largely remain the same, just ensure they work with your user data and API endpoints

  const handleSort = (newSort, newOrder) => {
    const searchParams = new URLSearchParams(location.search);
    newSort && searchParams.set('sort', newSort);
    newOrder && searchParams.set('order', newOrder);
    navigate(`${location.pathname}?${searchParams.toString()}`);
  };
  
  const handleFilter = (newFilter) => {
    const searchParams = new URLSearchParams(location.search);

    let role;
    switch (newFilter) {
      case 'user':
        role = 'user';
        break;
      case 'contrib':
        role = 'contributor';
        break;
      case 'editor':
        role = 'editor';
        break;
      case 'mod':
        role = 'mod';
        break;
      case 'admin':
        role = 'admin';
        break;
      default:
        role = '';
        break;
    }
    if (role) {
      searchParams.set('filter', 'role');
      searchParams.set('role', role);
    } else {
      searchParams.delete('filter');
      searchParams.delete('role');
    }
    searchParams.delete('page');
    navigate(`${location.pathname}?${searchParams.toString()}`);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const searchParams = new URLSearchParams(location.search);
    if (searchInput.trim()) {
      searchParams.set('search', searchInput.trim());
    } else {
      searchParams.delete('search');
    }
    searchParams.delete('page');
    navigate(`${location.pathname}?${searchParams.toString()}`);
  };

  const handleSearchClear = () => {
    setSearchInput('');
    const searchParams = new URLSearchParams(location.search);
    searchParams.delete('search');
    searchParams.delete('page');
    navigate(`${location.pathname}?${searchParams.toString()}`);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    const newQueryParams = { ...currentFilters, page: newPage };
    navigate({ search: stringifyQuery(newQueryParams) }); // Update URL without reloading the page
    setSuccessMessage('');
    setCriticalError('');
    setError('');
  };

  const openEditRow = (userID) => {
    setEditUserID(editUserID === userID ? null : userID);
    const userToEdit = userList.find(u => u.userID === userID);
    if (userToEdit) setEditedRecord({ userID: userToEdit.userID, username: userToEdit.username, roleName: userToEdit.roleName, _originalRoleName: userToEdit.roleName, status: userToEdit.status, notes: userToEdit.notes || '', notifyUser: true });
  };

  const handleQuickEditSubmit = async (e) => {
    e.preventDefault();
    dispatch(profileEdit({ profile: editedRecord }))
      .unwrap()
      .then(() => {
        setSuccessMessage('User updated successfully.');
        setError('');
        setEditUserID(null);
        setUpdateTrigger(prev => !prev);
      })
      .catch(error => {
        setError(error || 'Failed to update user.');
      });
  };

  const userDisable = async (userID) => {
    dispatch(userDisableAction({ userID }))
      .unwrap()
      .then(() => {
        setSuccessMessage(`User ${userID} deleted successfully.`);
        setCriticalError('');
        setError('');
        const queryParams = getCurrentQueryParams();
        // console.log('queryParams:', queryParams);
        // Rerender the list by fetching updated data
        dispatch(userListAction({queryParams}))
        .unwrap()
        .then(response => {
          // console.log('response:', response);
          // console.log('response.audioList:', response.audioList, 'response.totalRecords:', response.totalRecords);
          setUserList(response.userList || []);
          setTotalRecords(response.totalRecords);
        })
        .catch(error => {
          console.error("Error fetching updated user list:", error);
          setError(error || 'Failed to fetch updated user list.');
        });
      })
      .catch(error => {
        console.error("Error disabling user:", error);
        setError(error || 'Failed to disable user.'); // Update error state
      });
  };

  // Function to render controls
  const renderFilters = () => {
    const activeFilter = new URLSearchParams(location.search).get('filter') || 'all';
    const activeRole   = new URLSearchParams(location.search).get('role') || '';
    // A chip is active if filter=all (for All), or filter=role and role matches
    const chipClass = (filterName, roleName = null) => {
      let isActive;
      if (filterName === 'all') {
        isActive = activeFilter !== 'role';
      } else {
        isActive = activeFilter === 'role' && activeRole === roleName;
      }
      return `link filter-chip${isActive ? ' active' : ''}`;
    };
    return (
      <div className="filter-box">
        <ul>
          <li><button className={chipClass('all')} onClick={() => handleFilter('all')}>All</button></li>
          <li><button className={chipClass('user', 'user')} onClick={() => handleFilter('user')}>User</button></li>
          <li><button className={chipClass('contrib', 'contributor')} onClick={() => handleFilter('contrib')}>Contrib</button></li>
          <li><button className={chipClass('editor', 'editor')} onClick={() => handleFilter('editor')}>Editor</button></li>
          <li><button className={chipClass('mod', 'mod')} onClick={() => handleFilter('mod')}>Mod</button></li>
          <li><button className={chipClass('admin', 'admin')} onClick={() => handleFilter('admin')}>Admin</button></li>
        </ul>
      </div>
    );
  };

  const renderDownload = () => {
    return (
      <div className="download-box">
        <Link className="link" to="/user/download"><FeatherIcon icon="download" /></Link>
      </div>
    );
  }

  return (
    <div className="list-wrapper">
      <div className="display-box-wrapper">
        <div className="display-box">
          <h2 className='title'>User List</h2>
          <div className='message-box'>
            {isLoading && <p className="success">Loading...</p>}
            {successMessage && <p className="success">{successMessage}</p>}
            {criticalError && <p className="error">{criticalError}</p>}
            {error && <p className="error">{error}</p>}
          </div>
          {!criticalError && !isLoading ? (
            <dir>
              <div className="search-box">
                <form onSubmit={handleSearch}>
                  <div className="search-input-wrap">
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Search username, name, email..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                    />
                    {searchInput && (
                      <button type="button" className="search-clear" onClick={handleSearchClear} aria-label="Clear search">×</button>
                    )}
                  </div>
                  <button type="submit" className="button search-submit">Search</button>
                </form>
              </div>
              <div className="top-controls">
                {renderFilters()}
                <div className="right-side">
                  {renderPagination(totalRecords, recordsPerPage, page, handlePageChange)}
                  {renderDownload()}
                </div>
              </div>
              <table className="user-table big-table">
                <thead>
                  <tr>
                    {/* Adapt table headers for user data */}
                    <th>
                      <button className="link" onClick={() => handleSort('user')}>
                        User ID
                      </button>
                    </th>
                    <th>
                      <button className="link" onClick={() => handleSort('username')}>
                        Username
                      </button>
                    </th>
                    <th>First Name</th>
                    <th>Last Name</th>
                    <th>Email</th>
                    <th>URL</th>
                    <th>Location</th>
                    <th>
                      <button className="link" onClick={() => handleSort('role')}>
                        Role
                      </button>
                    </th>
                    <th>Status</th>
                    <th>
                      <button className="link" onClick={() => handleSort('date')}>
                        Date Added
                      </button>
                    </th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {userList.map((user, index) => (
                    <React.Fragment key={user.userID}>
                      <tr className={index % 2 === 0 ? 'row-even' : 'row-odd'}>
                        <td>{user.userID}</td>
                        <td>
                          {user.username}
                          <div>
                            <ul className="action-list">
                              <li><Link to={`/profile/${user.username}`}>View</Link></li>
                              <li><Link to={`/profile/edit/${user.username}`}>Edit</Link></li>
                              <li><button className="link" onClick={() => openEditRow(user.userID)}>Quick Edit</button></li>
                              <li><button className="link" onClick={() => userDisable(user.userID)}>Disable</button></li>
                            </ul>
                          </div>
                        </td>
                        <td>{user.firstname}</td>
                        <td>{user.lastname}</td>
                        <td>{user.email}</td>
                        <td>{user.url}</td>
                        <td>{user.location}</td>
                        <td>{user.roleName}</td>
                        <td>{user.status}</td>
                        <td>{formatDateAsFriendlyDate(user.addedOn)}</td>
                        <td className="notes-cell">{user.notes}</td>
                      </tr>
                      {editUserID === user.userID && (
                        <tr className={`${index % 2 === 0 ? 'row-even' : 'row-odd'} quick-edit`}>
                          <td colSpan="10">
                            <form onSubmit={handleQuickEditSubmit}>
                              <div className="form-group">
                              <div className="quick-edit-fields">
                                <div className="quick-edit-row">
                                  <div>
                                    <label htmlFor="roleName">Role:</label>
                                    <select
                                      name="roleName"
                                      value={editedRecord.roleName || ''}
                                      onChange={(e) => setEditedRecord({ ...editedRecord, roleName: e.target.value })}
                                    >
                                      <option value="user">User</option>
                                      <option value="contributor">Contributor</option>
                                      <option value="editor">Editor</option>
                                      <option value="mod">Mod</option>
                                      <option value="admin">Admin</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label htmlFor="status">Status:</label>
                                    <select
                                      name="status"
                                      value={editedRecord.status || ''}
                                      onChange={(e) => setEditedRecord({ ...editedRecord, status: e.target.value })}
                                    >
                                      <option value="Active">Active</option>
                                      <option value="Inactive">Inactive</option>
                                    </select>
                                  </div>
                                  <div className="quick-edit-notify">
                                    <label style={{ color: editedRecord.roleName === editedRecord._originalRoleName ? '#999' : 'inherit' }}>
                                      <input
                                        type="checkbox"
                                        checked={editedRecord.notifyUser || false}
                                        disabled={editedRecord.roleName === editedRecord._originalRoleName}
                                        onChange={(e) => setEditedRecord({ ...editedRecord, notifyUser: e.target.checked })}
                                      />
                                      {' '}Notify user
                                    </label>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <label className="block text-sm font-medium text-gray-700" htmlFor="notes">Notes:</label>
                                  <textarea
                                    name="notes"
                                    value={editedRecord.notes || ''}
                                    onChange={(e) => setEditedRecord({ ...editedRecord, notes: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
                                    rows={2}
                                  />
                                </div>
                                <div className="quick-edit-submit">
                                  <button className="button submit" type="submit">Update</button>
                                </div>
                              </div>
                              </div>
                            </form>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
              <div className="bottom-controls">
                {renderFilters()}
                <div className="right-side">
                  {renderPagination(totalRecords, recordsPerPage, page, handlePageChange)}
                  {renderDownload()}
                </div>
              </div>
            </dir>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default UserList;
