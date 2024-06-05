// userRoutes.js - contains the routes for user profiles and modifying user information
// List of routes:
//   /api/user/profile - Route for showing a user's public profile
//   /api/user/profile/edit - Route to update user profile
//   /api/user/user - Route for showing another user's profile (unimplemented)

// foundational imports
const express = require('express');
const router = express.Router();
const logger = require('config/logger').custom('AdminServer', 'info');
const { database: db } = require('config');

// authentication imports
const jwt = require('jsonwebtoken');
const verifyToken = require('../middleware/authMiddleware');

// configuration import
const { config } = require('config');
// pull these out of the config object
const jwtSecretKey = config.authToken.jwtSecretKey;

//
// USER PROFILES & MODIFYING USER INFORMATION
//

router.post('/list',  verifyToken, async (req, res) => {
  try {
    var sortArg = req.body.sort || 'user';
    const orderArg = req.body.order;
    var filterArg = req.body.filter || 'all';
    const rolenameArg = req.body.role;
    const pageArg = parseInt(req.body.page || 1, 10);
    const recordsPerPage = parseInt(req.body.recordsPerPage || 15, 10);
    const offset = (pageArg - 1) * recordsPerPage;
    logger.debug('req.body:',req.body);

    // Adjusted for user fields
    const sortOptions = {
      user: {
        field: 'userID',
        order: orderArg || 'ASC'
      },
      username: {
        field: 'LOWER(username)',
        order: orderArg || 'ASC'
      },
      role: {
        field: 'LOWER(roleName)',
        order: orderArg || 'ASC'
      },
      date: {
        field: 'addedOn',
        order: orderArg || 'DESC'
      }
      // TODO: Add "Disable" sort option
    };
    // if sortArg is not in sortOptions, default to 'user'
    if (!sortOptions[sortArg]) sortArg = 'user';
    const sortCondition = sortOptions[sortArg];
    const sortColumn = sortCondition.field
    const sortOrder = sortCondition.order;

    // Define filter options
    const filterOptions = {
      all: {
        query: '', // No additional query needed for 'all', showing all users
        values: []
      },
      role: {
        query: 'AND roleName = ?', 
        values: [rolenameArg] 
      }
    };
    // Redirect 'role' filter to 'all' if roleFilter is not provided
    if (filterArg === 'role' && !rolenameArg) filterArg = 'all'; 
    // Fallback to 'all' if filter is undefined or not in options
    let filterCondition = filterOptions[filterArg] || filterOptions['all']; 
    let filterQuery = filterCondition.query;
    let filterValues = filterCondition.values;

    const [countResult] = await db.query(`
    SELECT COUNT(*) AS totalRecords
    FROM users
    WHERE status != "Disabled" ${filterQuery};
  `, filterValues);
    
    const totalRecords = countResult[0].totalRecords;

    const [userList] = await db.query(`
      SELECT 
        userID,
        username,
        firstname,
        lastname,
        email,
        url,
        location,
        roleName,
        addedOn
      FROM users
      WHERE status != "Disabled" ${filterQuery}
      ORDER BY ${sortColumn} ${sortOrder}
      LIMIT ? OFFSET ?;
    `, [...filterValues, recordsPerPage, offset]);  

    res.status(200).json({
      totalRecords,
      userList,
    });
  } catch (error) {
    logger.error(`userRoutes:/list: Error listing users: ${error}`);
    res.status(500).send('Server error during user list retrieval');
  }
});

// Route for showing a user's public profile. 
// If a username is provided, it shows that user, 
// otherwise it extracts the user ID from the token, and returns the user's information.
// This is a protected route, only accessible to authenticated users.
router.post('/profile', async (req, res) => {
  try {
    // Get the username from the body if provided
    var targetUsername = req.body.username;
    logger.debug(`userRoutes:/profile: passed username: ${targetUsername}`);

    // Initialize variables for requesting user info
    let requestingUserInfo = null;
    let requestingUsername = null;

    // If no username is provided, verify the token and extract user info
    if (!targetUsername) {
      if (!req.cookies.token) {
        return res.status(400).json({ success: false, message: "No target user specified and no token provided" });
      }
      requestingUserInfo = jwt.verify(req.cookies.token, jwtSecretKey);
      logger.debug(`userRoutes:/profile: requestingUserInfo: ${JSON.stringify(requestingUserInfo, null, 2)}`);
      requestingUsername = requestingUserInfo.username;
      targetUsername = requestingUsername;
    }

    // Check if the user is trying to view their own profile
    let lookupStatus = (requestingUsername === targetUsername) ? "self" : "basic";
    logger.debug(`userRoutes:/profile: lookupStatus: ${lookupStatus}`);

    // Fetch the target user's information based on username
    let userInfo = await getUserInfo({ username: targetUsername });
    logger.debug(`userRoutes:/profile: userInfo: ${JSON.stringify(userInfo, null, 2)}`);
    if (!userInfo) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Create copies of immutable fields
    userInfo.roleNameShow = userInfo.roleName;
    userInfo.statusShow = userInfo.status;

    // Define the fields to be returned based on the user's permission level
    let allowedFields = [];
    switch (lookupStatus) {
      case "self":
        // Return everything except password
        allowedFields = ['userID', 'username', 'statusShow', 'email', 'firstname', 'lastname', 'email', 'url', 'bio', 'location', 'roleNameShow', 'addedOn'];
        break;
      case "basic":
      default:
        allowedFields = ['userID', 'username', 'firstname', 'lastname', 'url', 'bio', 'location', 'roleNameShow', 'addedOn'];
    }

    // Filter userInfo to include only the specified fields
    const userInfoReturned = Object.keys(userInfo).reduce((acc, key) => {
      if (allowedFields.includes(key)) {
        acc[key] = userInfo[key];
      }
      return acc;
    }, {});
    logger.debug(`userRoutes:/profile: filtered userInfoReturned: ${JSON.stringify(userInfoReturned, null, 2)}`);

    // Determine if the edit flag should be true or false
    const isEditable = (targetUsername == requestingUsername);

    // Respond with the user's information and the edit flag
    res.status(200).json({
      success: true,
      data: { ...userInfoReturned, edit: isEditable }
    });
  } catch (error) {
    // Log the error and respond with a server error status
    logger.error(`userRoutes:/profile: Error in profile route: ${error}`);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Route to update user profile information in the database.
// It extracts the user information from the request and updates the user's information.
// This is a protected route, only accessible to authenticated users.
// TODO: Deal with password updates
// TODO: Abstract permission check above and use it here
// TODO: Debug this route. It cheerfully works, but doesn't update.
router.post('/profile/edit', verifyToken, async (req, res) => {
  logger.debug('update profile');
  const allowedFields = ['email', 'firstname', 'lastname', 'url', 'bio', 'location', 'roleName', 'status'];
  logger.debug(`Request to update profile: ${JSON.stringify(req.body)}`);

  try {
    // Verify the token to get user ID
    const decoded = jwt.verify(req.cookies.token, jwtSecretKey);
    const userID = decoded.userID;

    // Filter out only the fields that are allowed and provided in req.body
    const queryFields = [];
    const queryValues = [];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        queryFields.push(`${field} = ?`);
        queryValues.push(req.body[field]);
      }
    });

    // Ensure there's something to update
    if (queryFields.length === 0) {
      return res.status(400).send('No valid fields provided for update');
    }

    // Add the userID to the values array
    queryValues.push(req.body.userID);

    // Construct the SQL query
    const query = `
      UPDATE users 
      SET ${queryFields.join(', ')}
      WHERE userID = ?
    `;

    logger.debug(`userRoutes:/edit: query: ${query}, queryValues: ${queryValues}`);

    // Execute the query
    const [result] = await db.query(query, queryValues);
    if (!result.affectedRows) {
      logger.error('userRoutes:/edit: Error updating user profile: No rows affected');
      res.status(500).send('Error updating user profile');
    } else {
      res.status(200).send({ message: 'Profile updated successfully' });
    }
  } catch (error) {
    logger.error(`userRoutes:/edit: Update failed: ${error}`);
    res.status(500).send('Server error');
  }
});

// Function to get user information by userID or username from the database
async function getUserInfo({ userID = null, username = null } = {}) {
  let query = '';
  let values = [];
  if (userID) {
    query = `SELECT * FROM users WHERE userID = ?`;
    values = [userID];
  } else if (username) {
    query = `SELECT * FROM users WHERE username = ?`;
    values = [username];
  } else {
    throw new Error("Invalid query parameters: either userID or username must be provided");
  }
  const [result] = await db.query(query, values);
  if (result.length < 1) {
    // No user found
    return null;
  } else {
    // Assuming the query returns a single user
    return result[0];
  }
}

// Function to get permissions for a role from the database
function hasPermission(requestingUserInfo, callingRoute) {
  logger.debug(`userRoutes:hasPermission: requestingUserInfo: ${JSON.stringify(requestingUserInfo, null, 2)}, typeof: ${typeof requestingUserInfo}`);
  // Early exit if requestingUserInfo is not provided or invalid
  if (!requestingUserInfo || !requestingUserInfo.permissions) {
    throw new Error('Invalid or missing requesting user info.');
  }
  // do a case-insensitive search of users perms from token w callingRoute
  const permissionsArray = requestingUserInfo.permissions.map(permission => permission.toLowerCase());
  const isPermitted = permissionsArray.includes(callingRoute.toLowerCase());
  return isPermitted;
}

// Route to disable a user
//
router.post('/disable', verifyToken, async (req, res) => {
  const { userID } = req.body;
  logger.debug(`userRoutes:/disable: userID: ${userID}`)
  if (!userID) {
    return res.status(400).send('User ID is required');
  }
  try {
    const query = `UPDATE users SET status = 'Disabled' WHERE userID = ?`;
    const values = [userID];
    const [result] = await db.query(query, values);
    if (result.affectedRows === 0) {
      return res.status(404).send('User not found');
    }
    res.status(200).json({ message: 'User disabled successfully' });
  } catch (error) {
    logger.error(`userRoutes:/disable: Error disabling user: ${error}`);
    res.status(500).send('Server error during user disabling');
  }
});



module.exports = router;