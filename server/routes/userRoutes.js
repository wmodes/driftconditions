// userRoutes.js - This file contains the routes for user profiles and modifying user information.
// List of routes:
//   /api/user/profile - Route for showing a user's public profile. If a targetID is provided, 
//        it shows that ID, otherwise it extracts the user ID from the token, and returns the 
//        user's information.
//   /api/user/profile/edit - Route to update user profile information in the database.
//   /api/user/user - Route for showing another user's profile. It extracts the user ID from 
//        the token, and returns the target user's information.

// foundational imports
const express = require('express');
const router = express.Router();
const db = require('../database');

// authentication imports
const jwt = require('jsonwebtoken');
const verifyToken = require('../middleware/authMiddleware');

// configuration import
const config = require('../config');

// pull these out of the config object
const jwtSecretKey = config.authToken.jwtSecretKey;

//
// USER PROFILES & MODIFYING USER INFORMATION
//

// Route for showing a user's public profile. 
// If a targetID is provided, it shows that ID, 
// otherwise it extracts the user ID from the token, and returns the user's information.
// This is a protected route, only accessible to authenticated users.
router.post('/profile', verifyToken, async (req, res) => {
  const fields = ['username', 'firstname', 'lastname', 'email', 'url', 'bio', 'location', 'role_name', 'added_on'];

  try {
    const token = req.cookies.token;
    const decoded = jwt.verify(token, jwtSecretKey);
    const userIDFromToken = decoded.userID;

    // Determine the target: Use provided targetID or username from the body or fallback to userID from the token
    const { targetID, targetUsername } = req.body; // Get username from the request body
    let userInfo;

    // Attempt to fetch the target user's information based on targetID or username
    userInfo = await getUserInfo({ userID: targetID || userIDFromToken, username: targetUsername });

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
    const isEditable = targetID === userIDFromToken || (!targetID && !targetUsername);

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
router.post('/profile/edit', verifyToken, (req, res) => {
  console.log('update profile');
  const { firstname, lastname, email, bio, location, url } = req.body;
  console.log('Request to update profile:', { firstname, lastname, email, bio, location, url });
  try {
    // Verify the token to get user ID
    const decoded = jwt.verify(req.cookies.token, jwtSecretKey);
    const userID = decoded.userID;

    // SQL query to update user information
    const query = `
      UPDATE users 
      SET firstname = ?, lastname = ?, email = ?, bio = ?, location = ?, url = ?
      WHERE user_id = ?
    `;
    const values = [firstname, lastname, email, bio, location, url, userID];

    // Execute the query
    db.query(query, values, (err, result) => {
      if (err) {
        console.error('Error updating user profile:', err);
        res.status(500).send('Error updating user profile');
      } else {
        res.status(200).send({ message: 'Profile updated successfully' });
      }
    });
  } catch (error) {
    console.error('Error in /profile/edit route:', error);
    res.status(500).send('Server error');
  }
});

// Function to get user information by userID or username from the database
async function getUserInfo({ userID = null, username = null } = {}) {
  return new Promise((resolve, reject) => {
    let query = '';
    let values = [];
    if (userID) {
      query = `SELECT * FROM users WHERE user_id = ?`;
      values = [userID];
    } else if (username) {
      query = `SELECT * FROM users WHERE username = ?`;
      values = [username];
    } else {
      return reject(new Error("Invalid query parameters: either userID or username must be provided"));
    }
    db.query(query, values, (err, result) => {
      if (err) {
        // console.error("Error fetching user info:", err);
        return reject(err);
      } else if (result.length < 1) {
        // console.log("No user found, returning null.");
        return resolve(null); // No user found
      } else {
        // console.log("Returning user info:", result[0]);
        return resolve(result[0]); // Assuming the query returns a single user
      }
    });
  });
}

// Function to get permissions for a role from the database
// Adjusted hasPermission function with added console.log statements
async function hasPermission(requestingUserInfo, callingRoute) {
  return new Promise((resolve, reject) => {
    // console.log('Checking permissions for:', requestingUserInfo.role_name, 'on route:', callingRoute);
    // Early exit if requestingUserInfo is not provided or invalid
    if (!requestingUserInfo || !requestingUserInfo.role_name) {
      // console.error('Invalid or missing requesting user info.');
      return reject(new Error('Invalid or missing requesting user info.'));
    }
    // Prep db params
    const query = 'SELECT permissions FROM roles WHERE role_name = ?';
    const values = [requestingUserInfo.role_name];
    // run db query
    db.query(query, values, (err, results) => {
      if (err) {
        // console.error('Error checking permissions:', err);
        return reject(err); // In case of error, default to denying permission
      }
      // console.log('Permissions query result:', results);
      if (results.length > 0 && results[0].permissions) {
        // Parse the permissions JSON to an array
        const permissionsArray = results[0].permissions;
        // console.log('Parsed permissions:', permissionsArray);
        // Check if the callingRoute is in the user's permissions
        const isPermitted = permissionsArray.includes(callingRoute);
        // console.log('Permission for route:', callingRoute, 'is', isPermitted ? 'granted' : 'denied');
        // console.log('Returning permission:', isPermitted)
        return resolve(isPermitted);
      } else {
        // If no permissions found or callingRoute is not permitted, return false
        // console.log('No permissions found or callingRoute not permitted for role:', requestingUserInfo.role_name);
        return resolve(false);
      }
    });
  });
}

// Route for showing another user's profile. It extracts the user ID from the token, and returns the target user's information.
// This is a protected route, only accessible to authenticated users.
router.post('/user', verifyToken, async (req, res) => {
  fields = ['username', 'firstname', 'lastname', 'email', 'url', 'bio', 'location', 'role_name', 'validated', 'added_on'];
  try {
    const { username } = req.body; // Extracting username from the request body
    // console.log('Request for userlookup received', { username });
    if (!username) {
      // console.log('Bad request: Missing username');
      return res.status(400).send("Bad request: Missing username");
    }
    // Extract userID of the requesting user from the token
    const token = req.cookies.token;
    const decoded = jwt.verify(token, jwtSecretKey);
    const requestingUserID = decoded.userID;
    // console.log('Decoded JWT for user ID', { requestingUserID });
    // Fetch requesting user's information for permission check
    const requestingUserInfo = await getUserInfo({ userID: requestingUserID });
    // console.log('Requesting user info:', requestingUserInfo);
    // Check if the requesting user has permission to view the target user's information
    if (!await hasPermission(requestingUserInfo, 'userlookup')) { // Make sure to await the result
      // console.log('Permission denied for userlookup', { requestingUserID });
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
    // console.log('Target user info:', targetUserInfo);
    if (targetUserInfo) {
      res.status(200).json({
        success: true,
        data: targetUserInfo
      });
    } else {
      // console.log('User not found', { username });
      res.status(404).send("User not found");
    }
  } catch (error) {
    // console.error('Error in userlookup route:', error);
    res.status(500).send("Server error");
  }
});

module.exports = router;