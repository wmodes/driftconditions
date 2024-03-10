// UserList.js - List user details

// Import necessary hooks and utilities
import React, { useEffect, useState } from 'react';
import { Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { userList as userListAction } from '../store/userSlice'; 
import { parseQuery, stringifyQuery } from '../utils/queryUtils';
import { renderPagination } from '../utils/listUtils';
import { formatDateForDisplay } from '../utils/formatUtils';

// Import the config object
const config = require('../config/config');
// Pull variables from the config object
const recordsPerPage = config.user.recordsPerPage;
const retryLimit = config.server.retryLimit;

function UserList() {
  // Use existing hooks and state setup
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useSelector((state) => state.auth);

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

  useEffect(() => {
    // Adapt useEffect for loading user data
    if (!isAuthenticated || retryAttempt >= retryLimit) return;
    setIsLoading(true);

    const searchParams = new URLSearchParams(location.search);
    const page = parseInt(searchParams.get('page') || '1', 10);
    setPage(page);
    const sort = searchParams.get('sort');
    const order = searchParams.get('order');
    const filter = searchParams.get('filter') || 'all';
    const role = searchParams.get('role');

    const queryParams = { page, sort, order, filter, role };
    // console.log('User list query params:', queryParams);

    dispatch(userListAction(queryParams))
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
  }, [dispatch, location.search, isAuthenticated, retryAttempt]);

  // Adapt handlePageChange, handleSort, and handleFilter for user data
  // These functions can largely remain the same, just ensure they work with your user data and API endpoints

  // Redirect if not authenticated
  if (isAuthenticated === false) {
    return <Navigate to='/signin' replace={true} />;
  }

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
                {renderPagination(totalRecords, recordsPerPage, page, handlePageChange)}
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
                      <td>{user.user_id}</td>
                      <td>
                        <Link to={`/profile/${user.username}`} className="link-button">
                          {user.username}
                        </Link>
                      </td>
                      <td>{user.firstname}</td>
                      <td>{user.lastname}</td>
                      <td>{user.email}</td>
                      <td>{user.url}</td>
                      <td>{user.location}</td>
                      <td>{user.role_name}</td>
                      <td>{formatDateForDisplay(user.added_on)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="bottom-controls">
                {renderPagination(totalRecords, recordsPerPage, page, handlePageChange)}
              </div>
            </dir>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default UserList;
