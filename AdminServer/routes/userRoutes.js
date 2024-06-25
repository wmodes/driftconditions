// @file userRoutes.js - contains the routes for user profiles and modifying user information
// List of routes:
//   /api/user/profile - Route for showing a user's public profile
//   /api/user/profile/edit - Route to update user profile
//   /api/user/user - Route for showing another user's profile (unimplemented)
//   /api/user/disable - Route to disable a user

// foundational imports
const express = require('express');
const router = express.Router();
const logger = require('config/logger').custom('AdminServer', 'debug');
const { database: db } = require('config');

// authentication imports
const jwt = require('jsonwebtoken');
const verifyToken = require('../middleware/authMiddleware');

// configuration import
const { config } = require('config');
// pull these out of the config object
const jwtSecretKey = config.authToken.jwtSecretKey;

/**
 * Route to list users with sorting, filtering, and pagination.
 * @route POST /list
 * @access Protected
 */
router.post('/list', verifyToken, async (req, res) => {
  try {
    const requestingUserInfo = getRequestingUserInfo(req);
    if (!hasPermission(requestingUserInfo, 'userList')) {
      return res.status(403).send('Permission denied');
    }

    var sortArg = req.body.sort || 'user';
    const orderArg = req.body.order;
    var filterArg = req.body.filter || 'all';
    const rolenameArg = req.body.role;
    const pageArg = parseInt(req.body.page || 1, 10);
    const recordsPerPage = parseInt(req.body.recordsPerPage || 15, 10);
    const offset = (pageArg - 1) * recordsPerPage;
    logger.debug('req.body:', req.body);

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
    const sortColumn = sortCondition.field;
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
        status,
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

/**
 * Route for showing a user's public profile.
 * If a username is provided, it shows that user,
 * otherwise it extracts the user ID from the token and returns the user's information.
 * This is a protected route, only accessible to authenticated users.
 * @route POST /profile
 * @access Protected
 */
router.post('/profile', async (req, res) => {
  try {
    const requestingUserInfo = getRequestingUserInfo(req);
    if (!hasPermission(requestingUserInfo, 'profile')) {
      return res.status(403).send('Permission denied');
    }

    // Get the username from the requesting user's information
    const requestingUsername = requestingUserInfo.username;
    // Get the username from the body if provided, otherwise use the requesting user's username
    const targetUsername = req.body.username || requestingUsername;
    logger.debug(`userRoutes:/profile: target username: ${targetUsername}`);
    // Get permission level of the user
    const permissions = requestingUserInfo.permissions;
    // Define the fields to be returned based on the user's permission level
    const allowedFields = getAllowedFields(permissions, requestingUsername, targetUsername);
    // Determine if the edit flag should be true or false based on 'editable' field presence
    const isEditable = allowedFields.includes('editable');

    // Fetch the target user's information based on username
    let userInfo = await getUserInfo({ username: targetUsername });
    logger.debug(`userRoutes:/profile: userInfo: ${JSON.stringify(userInfo, null, 2)}`);
    if (!userInfo) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Create copies of immutable fields
    userInfo.roleNameShow = userInfo.roleName;
    userInfo.statusShow = userInfo.status;

    // Filter userInfo to include only the allowed fields
    const userInfoReturned = Object.keys(userInfo).reduce((acc, key) => {
      if (allowedFields.includes(key)) {
        acc[key] = userInfo[key];
      }
      return acc;
    }, {});
    logger.debug(`userRoutes:/profile: filtered userInfoReturned: ${JSON.stringify(userInfoReturned, null, 2)}`);

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

/**
 * Route to update user profile information in the database.
 * It extracts the user information from the request and updates the user's information.
 * This is a protected route, only accessible to authenticated users.
 * @route POST /profile/edit
 * @access Protected
 */
router.post('/profile/edit', verifyToken, async (req, res) => {
  logger.debug('update profile');

  try {
    const requestingUserInfo = getRequestingUserInfo(req);
    if (!hasPermission(requestingUserInfo, 'profileEdit')) {
      return res.status(403).send('Permission denied');
    }

    // Get the username from the requesting user's information
    const requestingUsername = requestingUserInfo.username;
    // Get the username from the body if provided, otherwise use the requesting user's username
    const targetUsername = req.body.username || requestingUsername;
    // Get the userID from the requesting user's information
    const targetUserID = req.body.userID || requestingUserInfo.userID;
    logger.debug(`userRoutes:/profile/edit: target username: ${targetUsername}`);
    // Get permission level of the user
    const permissions = requestingUserInfo.permissions;
    // Define the fields to be returned based on the user's permission level
    const allowedFields = getAllowedFields(permissions, requestingUsername, targetUsername);
    // Determine if the edit flag should be true or false based on 'editable' field presence
    const isEditable = allowedFields.includes('editable');

    // valid db fields
    const validDBFields = ['email', 'firstname', 'lastname', 'url', 'bio', 'location', 'roleName', 'status'];

    // Filter out only the fields that are allowed and provided in req.body
    const queryFields = [];
    const queryValues = [];

    allowedFields.forEach(field => {
      if (validDBFields.includes(field) && req.body[field] !== undefined) {
        queryFields.push(`${field} = ?`);
        queryValues.push(req.body[field]);
      }
    });

    // Ensure there's something to update
    if (queryFields.length === 0) {
      return res.status(400).send('No valid fields provided for update');
    }

    // Add the userID to the values array
    queryValues.push(targetUserID);

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

/**
 * Route to disable a user.
 * @route POST /disable
 * @access Protected
 */
router.post('/disable', verifyToken, async (req, res) => {
  const requestingUserInfo = getRequestingUserInfo(req);
  if (!hasPermission(requestingUserInfo, 'userEdit')) {
    return res.status(403).send('Permission denied');
  }

  const { userID } = req.body;
  logger.debug(`userRoutes:/disable: userID: ${userID}`);
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

/*
 * Helper functions
 */

/**
 * Function to get user information by userID or username from the database.
 * @param {Object} params - Object containing userID or username.
 * @param {number} [params.userID=null] - The ID of the user.
 * @param {string} [params.username=null] - The username of the user.
 * @returns {Object|null} - The user information or null if not found.
 * @throws {Error} - Throws an error if both userID and username are not provided.
 */
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

/**
 * Extract and return the requesting user's information from the request object.
 * @param {Object} req - The request object.
 * @returns {Object} - The requesting user's information.
 * @throws {Error} - Throws an error if no token is provided.
 */
const getRequestingUserInfo = (req) => {
  const token = req.cookies.token;
  if (!token) {
    throw new Error("No token provided");
  }
  const userInfo = jwt.verify(token, jwtSecretKey);
  logger.debug(`userRoutes:getRequestingUserInfo: userInfo: ${JSON.stringify(userInfo, null, 2)}`);
  return userInfo;
};

/**
 * Check if the requesting user has permission for the specified route.
 * @param {Object} requestingUserInfo - The requesting user's information.
 * @param {string} callingRoute - The route being accessed.
 * @returns {boolean} - True if the user has permission, otherwise false.
 * @throws {Error} - Throws an error if requesting user info is invalid or missing.
 */
function hasPermission(requestingUserInfo, callingRoute) {
  logger.debug(`userRoutes:hasPermission: requestingUserInfo: ${JSON.stringify(requestingUserInfo, null, 2)}, typeof: ${typeof requestingUserInfo}`);
  
  // Early exit if requestingUserInfo is not provided or invalid
  if (!requestingUserInfo || !requestingUserInfo.permissions) {
    throw new Error('Invalid or missing requesting user info.');
  }
  
  // Do a case-insensitive search of user's permissions from token with callingRoute
  const permissionsArray = requestingUserInfo.permissions.map(permission => permission.toLowerCase());
  const isPermitted = permissionsArray.includes(callingRoute.toLowerCase());
  
  return isPermitted;
}

/**
 * Get the allowed fields based on the user's permission level.
 * @param {string} lookupStatus - The permission level of the user.
 * @returns {Array<string>} - The list of allowed fields.
 */
const getAllowedFields = (permissions, requestingUsername, targetUsername) => {
  if (permissions.includes("userEdit")) {
    lookupStatus = "extended";
  }
  else if (requestingUsername === targetUsername) {
    lookupStatus = "self";
  }
  else {
    lookupStatus = "basic";
  }
  switch (lookupStatus) {
    case "extended":
      // Return everything except password, adding 'editable' field
      return ['userID', 'username', 'status', 'email', 'firstname', 'lastname', 'email', 'url', 'bio', 'location', 'roleName', 'addedOn', 'editable'];
    case "self":
      // Return everything except password, and replacing roleName with roleNameShow, adding 'editable' field
      return ['userID', 'username', 'statusShow', 'email', 'firstname', 'lastname', 'email', 'url', 'bio', 'location', 'roleNameShow', 'addedOn', 'editable'];
    case "basic":
    default:
      return ['userID', 'username', 'firstname', 'lastname', 'url', 'bio', 'location', 'roleNameShow', 'addedOn'];
  }
};

module.exports = router;
