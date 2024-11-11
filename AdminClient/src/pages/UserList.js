// UserList.js - List user details

// Import necessary hooks and utilities
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { userList as userListAction, userDisable as userDisableAction } from '../store/userSlice'; 
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
        setCriticalError('Failed to fetch user list.');
        setUserList([]);
        setIsLoading(false);
        setRetryAttempt(prevAttempt => prevAttempt + 1);
      });
  }, [dispatch, location.search, retryAttempt]);

  // Adapt handlePageChange, handleSort, and handleFilter for user data
  // These functions can largely remain the same, just ensure they work with your user data and API endpoints

  const handleSort = (newSort, newOrder) => {
    const searchParams = new URLSearchParams(location.search);
    newSort && searchParams.set('sort', newSort);
    newOrder && searchParams.set('order', newOrder);
    navigate(`${location.pathname}?${searchParams.toString()}`);
  };
  
  const handleFilter = (newFilter, targetID = null) => {
    const searchParams = new URLSearchParams(location.search);
  
    let role;
    switch (newFilter) {
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
          setError('Failed to fetch updated user list.');
        });
      })
      .catch(error => {
        console.error("Error disabling user:", error);
        setError('Failed to disable user.'); // Update error state
      });
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
            <button className="link" onClick={() => handleFilter('user')}>
              User
            </button>
          </li>
          <li>
            <button className="link" onClick={() => handleFilter('contrib')}>
              Contrib
            </button>
          </li>
          <li>
            <button className="link" onClick={() => handleFilter('editor')}>
              Editor
            </button>
          </li>
          <li>
            <button className="link" onClick={() => handleFilter('mod')}>
              Mod
            </button>
          </li>
          <li>
            <button className="link" onClick={() => handleFilter('admin')}>
              Admin
            </button>
          </li>
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
                  </tr>
                </thead>
                <tbody>
                  {userList.map(user => (
                    <tr key={user.userID}>
                      {/* Adapt table cells for user data */}
                      <td>{user.userID}</td>
                      <td>
                        {user.username}
                        <div>
                          <ul className="action-list">
                            <li><Link to={`/profile/${user.username}`}>View</Link></li>
                            <li><Link to={`/profile/edit/${user.username}`}>Edit</Link></li>
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
                    </tr>
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
