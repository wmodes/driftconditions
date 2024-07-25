// RolesList - component to display and edit the list of roles

import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { roleList, roleUpdate } from '../store/userSlice';
import { formatListAsString } from '../utils/formatUtils';
import { TagSelect } from '../utils/formUtils';

// Import the config object from the config.js file
import config from '../config/config';
// pull variables from the config object
const routeList = Object.keys(config.adminClient.pages); 

function RolesList() {
  const dispatch = useDispatch();
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  // which role is being edited
  const [editRoleID, setEditRoleID] = useState(null);
  // editing values for the role
  const [editedRecord, setEditedRecord] = useState({
    roleID: null,
    roleName: '',
    permissions: '',
    comments: ''
  });
  // to trigger a re-fetch of the roles list
  const [updateTrigger, setUpdateTrigger] = useState(false);

  // Adapt error handling and URL search params parsing
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
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
  }, [dispatch, updateTrigger]);

  // reveal the edit form for the roles
  const openEditRow = (role) => {
    setEditRoleID(editRoleID === role.roleID ? null : role.roleID);
    // Update the editingValues state with the role's current values
    setEditedRecord(role);
  };

  const handlePermisssionChange = (newPermissions) => {
    setEditedRecord(prevState => ({ ...prevState, permissions:newPermissions }));
  };

  const handleSubmit = async (e, roleId) => {
    e.preventDefault(); // Prevent form from causing a page reload
    // console.log('Updated role:', editedRecord);
    // console.log('Updated role:', updatedRole);
    await dispatch(roleUpdate({roleRecord: editedRecord}))
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

  function oddOrEvenRow(num) {
    return num % 2 === 0 ? "row-even" : "row-odd";
  }  

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
                </tr>
              </thead>
              <tbody>
              {roles.map(role => (
                <React.Fragment key={role.roleID}>
                  <tr className={`data-row ${oddOrEvenRow(role.roleID)}`} onClick={() => openEditRow(role)}>
                    <td className="role-id">{role.roleID}</td>
                    <td className="role-name">
                      {role.roleName}
                      <div>
                          <ul className="action-list">
                            <li><button className="link" onClick={() => openEditRow(role)}>Edit</button></li>
                          </ul>
                        </div>
                    </td>
                    <td className="perms">{formatListAsString(role.permissions)}</td>
                    <td className="comments">{role.comments}</td>
                  </tr>
                  {/* quick edit fields */}
                  {editRoleID === role.roleID && (
                    <tr className={`edit-row ${oddOrEvenRow(role.roleID)}`}>
                      <td colSpan="5">
                      <div className="form-group">
                          <form onSubmit={(e) => handleSubmit(e, role.roleID)}>
                            <TagSelect
                              options={routeList} // Your options array
                              initialValues={role.permissions}
                              onTagChange={handlePermisssionChange}
                            />
                            
                            <label className="form-label" htmlFor="comments">Comments:</label>
                            <textarea
                              className="form-textarea"
                              name="comments"
                              defaultValue={role.comments || ''}
                              onChange={(e) => setEditedRecord(prevState => ({
                                ...prevState,
                                comments: e.target.value
                              }))}
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
