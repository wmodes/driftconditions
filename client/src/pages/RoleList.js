// RolesList - component to display and edit the list of roles

import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { roleList, roleUpdate } from '../store/userSlice';
import { formatListForDisplay, formatListForDB } from '../utils/formatUtils';
import { SelectList } from '../utils/formUtils';

// Import the config object from the config.js file
const config = require('../config/config');
// pull variables from the config object
const routeList = Object.keys(config.client.pages); 

function RolesList() {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  // which role is being edited
  const [editRoleID, setEditRoleID] = useState(null);
  // editing values for the role
  const [editingValues, setEditingValues] = useState({
    permissions: '',
    comments: ''
  });
  // permissions list
  const [permissions, setPermissions] = useState([]);
  // to trigger a re-fetch of the roles list
  const [updateTrigger, setUpdateTrigger] = useState(false);

  // Adapt error handling and URL search params parsing
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) return;
    dispatch(roleList())
      .unwrap()
      .then(response => {
        setRoles(response.roles);
        setIsLoading(false);
        setError('');
      })
      .catch(error => {
        console.error("Error fetching roles list:", error);
        setError(error.message || 'Failed to fetch roles');
        setIsLoading(false);
      });
  }, [dispatch, isAuthenticated, updateTrigger]);

  // reveal the edit form for the roles
  const handleEdit = (role) => {
    setEditRoleID(editRoleID === role.role_id ? null : role.role_id);
    // Update the editingValues state with the role's current values
    setEditingValues({
      permissions: formatListForDisplay(role.permissions),
      comments: role.comments
    });
  };

  const handleSubmit = async (e, roleId) => {
    e.preventDefault(); // Prevent form from causing a page reload
    const formData = new FormData(e.target);
    const updatedRole = Object.fromEntries(formData.entries());
    // Adjusted to include role_id explicitly if not already part of formData
    updatedRole.role_id = roleId || updatedRole.role_id;
    updatedRole.permissions = formatListForDB(updatedRole.permissions);
    console.log('Updated role:', updatedRole);
    console.log('Updated role (before dispatch):', updatedRole);
    await dispatch(roleUpdate(updatedRole))
      .unwrap()
      .then(response => {
        setSuccessMessage('Role updated successfully');
        setError('');
        // Close the edit form or refresh roles list as needed
        setEditRoleID(null);
        setUpdateTrigger(!updateTrigger);
      })
      .catch(error => {
        console.error("Error updating role:", error);
        setError(error.message || 'Failed to update role');
      });
};

  if (isAuthenticated === false) {
    return <Navigate to='/signin' replace={true} />;
  }

  function oddOrEvenRow(num) {
    return num % 2 === 0 ? "row-even" : "row-odd";
  }  
  
  const handleAddPermission = (newPermission) => {
    setPermissions([...permissions, newPermission]);
  };

  return (
    <div className="list-wrapper">
      <div className="display-box-wrapper">
        <div className="display-box">
          <h2 className='title'>Role List</h2>
          <div className='message-box'>
            {isLoading && <p className="success">Loading...</p>}
            {successMessage && <p className="success">{successMessage}</p>}
            {error && <p className="error">{error}</p>}
          </div>
          {!isLoading ? (
            <table className="role-table big-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Role Name</th>
                  <th>Permissions</th>
                  <th>Comments</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
              {roles.map(role => (
                <React.Fragment key={role.role_id}>
                  <tr className={`data-row ${oddOrEvenRow(role.role_id)}`} onClick={() => handleEdit(role)}>
                    <td className="role-id">{role.role_id}</td>
                    <td className="role-name">{role.role_name}</td>
                    <td className="perms">{formatListForDisplay(role.permissions)}</td>
                    <td className="comments">{role.comments}</td>
                    <td className="edit-field">
                      <button className="link" onClick={() => handleEdit(role)}>edit</button>
                    </td>
                  </tr>
                  {editRoleID === role.role_id && (
                    <tr className={`edit-row ${oddOrEvenRow(role.role_id)}`}>
                      <td colSpan="5">
                      <div className="form-group">
                          <form onSubmit={(e) => handleSubmit(e, role.role_id)}>
                            <input type="hidden" name="role_id" value={role.role_id} />
                            <input type="hidden" name="role_name" value={role.role_name} />
                          
                            <div className="flex gap-3">
                              <div className="flex flex-col">
                                <label className="form-label" htmlFor="permissions">Permissions:</label>
                                <SelectList options={routeList} onAdd={handleAddPermission} />
                              </div>
                              <div className="flex-grow">
                                <textarea
                                  className="form-textarea"
                                  name="permissions"
                                  defaultValue={formatListForDisplay(role.permissions)}
                                />
                              </div>
                            </div>
                            
                            <label className="form-label" htmlFor="comments">Comments:</label>
                            <textarea
                              className="form-textarea"
                              name="comments"
                              defaultValue={role.comments || ''}
                            />
                            <button className="button submit" type="submit">Update</button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              </tbody>
            </table>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default RolesList;
