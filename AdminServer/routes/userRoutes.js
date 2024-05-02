// userRoutes.js - contains the routes for user profiles and modifying user information
// List of routes:
//   /api/user/profile - Route for showing a user's public profile
//   /api/user/profile/edit - Route to update user profile
//   /api/user/user - Route for showing another user's profile (unimplemented)

// foundational imports
const express = require('express');
const router = express.Router();
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
      WHERE 1=1 ${filterQuery};
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
      WHERE 1=1 ${filterQuery}
      ORDER BY ${sortColumn} ${sortOrder}
      LIMIT ? OFFSET ?;
    `, [...filterValues, recordsPerPage, offset]);

    res.status(200).json({
      totalRecords,
      userList,
    });
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).send('Server error during user list retrieval');
  }
});

// Route for showing a user's public profile. 
// If a targetID is provided, it shows that ID, 
// otherwise it extracts the user ID from the token, and returns the user's information.
// This is a protected route, only accessible to authenticated users.
router.post('/profile', verifyToken, async (req, res) => {
  const fields = ['username', 'firstname', 'lastname', 'email', 'url', 'bio', 'location', 'roleName', 'addedOn'];

  try {
    // get userID and username from token
    const token = req.cookies.token;
    const decoded = jwt.verify(token, jwtSecretKey);
    const userIDFromToken = decoded.userID;
    const usernameFromToken = decoded.username;

    // Determine the target: Use provided targetID or username from the body 
    var { targetID, targetUsername } = req.body;

    // if no targetID or targetUsername is provided, use the user ID from the token
    if (!targetID && !targetUsername) {
      targetID = userIDFromToken;
    }

    // Attempt to fetch the target user's information based on targetID or username
    let userInfo = await getUserInfo({ userID: targetID, username: targetUsername });
    logger.debug('User info:', userInfo);

    // Check if userInfo is null (user not found) and respond accordingly
    if (!userInfo) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Filter userInfo to include only the specified fields
    const filteredUserInfo = Object.keys(userInfo).reduce((acc, key) => {
      if (fields.includes(key)) {
        acc[key] = userInfo[key];
      }
      return acc;
    }, {});

    // Determine if the edit flag should be true or false
    // const isEditable = targetID == userIDFromToken || (!targetID && !targetUsername);
    const isEditable = (targetID == userIDFromToken) || (targetUsername == usernameFromToken);
    logger.debug('targetID:', targetID, 'userIDFromToken:', userIDFromToken);
    logger.debug('targetUsername:', targetUsername, 'usernameFromToken:', usernameFromToken);
    logger.debug('isEditable:', isEditable);

    // Respond with the user's information and the edit flag
    res.status(200).json({
      success: true,
      data: { ...filteredUserInfo, edit: isEditable }
    });
  } catch (error) {
    // Log the error and respond with a server error status
    console.error('Error in profile route:', error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Route to update user profile information in the database.
// It extracts the user information from the request and updates the user's information.
// This is a protected route, only accessible to authenticated users.
// TODO: Deal with password updates
router.post('/profile/edit', verifyToken, async (req, res) => {
  logger.debug('update profile');
  const { firstname, lastname, email, bio, location, url } = req.body;
  logger.debug('Request to update profile:', { firstname, lastname, email, bio, location, url });
  try {
    // Verify the token to get user ID
    const decoded = jwt.verify(req.cookies.token, jwtSecretKey);
    const userID = decoded.userID;

    // SQL query to update user information
    const query = `
      UPDATE users 
      SET firstname = ?, lastname = ?, email = ?, bio = ?, location = ?, url = ?
      WHERE userID = ?
    `;
    const values = [firstname, lastname, email, bio, location, url, userID];

    // Execute the query
    const [result] = await db.query(query, values);
    if (!result.affectedRows) {
      console.error('Error updating user profile: No rows affected');
      res.status(500).send('Error updating user profile');
    } else {
      res.status(200).send({ message: 'Profile updated successfully' });
    }    
  } catch (error) {
    console.error('Error in /profile/edit route:', error);
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
// Adjusted hasPermission function with added logger.debug statements
async function hasPermission(requestingUserInfo, callingRoute) {
  // Early exit if requestingUserInfo is not provided or invalid
  if (!requestingUserInfo || !requestingUserInfo.roleName) {
    throw new Error('Invalid or missing requesting user info.');
  }
  // Prep db params
  const query = 'SELECT permissions FROM roles WHERE roleName = ?';
  const values = [requestingUserInfo.roleName];
  // Run db query
  const [results] = await db.query(query, values);
  if (results.length > 0 && results[0].permissions) {
    // Parse the permissions JSON to an array
    const permissionsArray = JSON.parse(results[0].permissions);
    // Check if the callingRoute is in the user's permissions
    const isPermitted = permissionsArray.includes(callingRoute);
    return isPermitted;
  } else {
    // If no permissions found or callingRoute is not permitted, return false
    return false;
  }
}

// Route for showing another user's profile. It extracts the user ID from the token, and returns the target user's information.
// This is a protected route, only accessible to authenticated users.
router.post('/user', verifyToken, async (req, res) => {
  fields = ['username', 'firstname', 'lastname', 'email', 'url', 'bio', 'location', 'roleName', 'validated', 'addedOn'];
  try {
    const { username } = req.body; // Extracting username from the request body
    logger.debug('Request for userlookup received', { username });
    if (!username) {
      logger.debug('Bad request: Missing username');
      return res.status(400).send("Bad request: Missing username");
    }
    // Extract userID of the requesting user from the token
    const token = req.cookies.token;
    const decoded = jwt.verify(token, jwtSecretKey);
    const requestingUserID = decoded.userID;
    logger.debug('Decoded JWT for user ID', { requestingUserID });
    // Fetch requesting user's information for permission check
    const requestingUserInfo = await getUserInfo({ userID: requestingUserID });
    logger.debug('Requesting user info:', requestingUserInfo);
    // Check if the requesting user has permission to view the target user's information
    if (!await hasPermission(requestingUserInfo, 'userlookup')) { // Make sure to await the result
      logger.debug('Permission denied for userlookup', { requestingUserID });
      return res.status(403).send("Forbidden: You do not have permission to view this user's information");
    }
    // Fetch and return the target user's information based on username
    const targetUserInfo = await getUserInfo({ username: username });
    // remove all but the fields we want to return  
    for (const field in targetUserInfo) {
      if (!fields.includes(field)) {
        delete targetUserInfo[field];
      }
    }
    logger.debug('Target user info:', targetUserInfo);
    if (targetUserInfo) {
      res.status(200).json({
        success: true,
        data: targetUserInfo
      });
    } else {
      logger.debug('User not found', { username });
      res.status(404).send("User not found");
    }
  } catch (error) {
    // console.error('Error in userlookup route:', error);
    res.status(500).send("Server error");
  }
});

module.exports = router;