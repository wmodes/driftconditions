// authRoutes.js - user registration and authentication
// List off Routes:
//   /api/auth/signup - Route for handling user registration.

// foundational imports
const express = require('express');
const router = express.Router();
const db = require('../../../config/database');

// authentication imports
const jwt = require('jsonwebtoken');

// configuration import
const config = require('../../../config/config');
// pull these out of the config object
const jwtSecretKey = config.authToken.jwtSecretKey;
const tokenRefresh = config.authToken.tokenRefresh;

//
// USER REGISTRATION & AUTHENTICATION
//

// Route for checking if the user is authenticated. 
router.post('/check', async (req, res) => {
  let tokenData = null;
  try {
    // check if the user is authenticated 
    if (req.cookies.token) {
      tokenData = await decodeToken(req.cookies.token);
    } else {
      console.log("no token found");
    }
    // fetch the row in the "roles" table matching the role
    const user = await getRolePermissions(tokenData ? tokenData.userID : null);
    if (!user) {
      return res.status(403).json({ 
        error: {
          code: 403,
          reason: "not_authorized",
          message: "Role not found"
        }
      });
    }
    // console.log("user:", user);

    // if user.editDate (which is really the role permisssions edit date) 
    // is after the token's issuedAt date, then issue a new token 
    // with the updated permissions
    if (tokenData) {
      const oneHourFromNow = new Date(Date.now() + tokenRefresh); // 1 hour from now
      if (user.editDate > tokenData.issuedAt || tokenData.expiresAt <= oneHourFromNow) {
        // console.log("role permissions have been updated or token expires within 1 hour");
        const token = issueNewToken(res, user);
        // console.log("new token issued");
      }
    }

    // check if the context is included in the "permissions" field
    // (if not, return error 403 and status: "not authorized")
    const pageContext = req.body.context;
    if (!user.permissions.includes(pageContext)) {
      return res.status(403).json({ 
        user: user,
        error: {
          code: 403,
          reason: "not_authorized",
          message: "Access denied to this page"
        }
      });
    }
    // console.log("context and permission matched");
    // if all checks are okay, return 200
    res.status(200).json({ 
      authorized: true,
      user: user,
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(403).json({ 
        user: user,
        error: {
          code: 403,
          reason: "not_authenticated",
          message: "Invalid or expired token"
        }
      });
    }
    // console.error('Server error during auth check:', error);
    res.status(500).send('Server error');
  }
});

// helper for /check route
// Decode the token and return the user data
async function decodeToken(token) {
  try {
    // This will throw an error if the token is invalid or expired
    const decoded = jwt.verify(token, jwtSecretKey); 
    const { userID, username, permissions, iat, exp } = decoded;
    return {
      userID,
      username,
      permissions,
      issuedAt: new Date(iat * 1000), // Convert Unix timestamp to JavaScript Date object
      expiresAt: new Date(exp * 1000),
    };
  } catch (error) {
    console.error('Error decoding token:', error);
    throw error; // Rethrow the error to be caught by the surrounding try-catch block
  }
}

// helper for /check route
// Fetch the role_name and permissions for the user
async function getRolePermissions(userID) {
  try {
    if (!userID) {
      // Handle 'noauth' permissions logic here
      // Example:
      const roleQuery = `SELECT * FROM roles WHERE role_name = ? LIMIT 1;`;
      const roleValues = 'noauth';
      const [roleRows] = await db.query(roleQuery, roleValues);
      // console.log("roleRows:", roleRows);
      if (roleRows.length === 0) {
        // console.log('Role not found:', roleName);
        return null; // Role not found
      }
      const user = {
        userID: null,
        username: null,
        roleName: roleRows[0].role_name,
        permissions: roleRows[0].permissions,
        editDate: roleRows[0].edit_date
      }
      return user;
    }
    // First, fetch the role_name of the user
    const userQuery = `SELECT * FROM users WHERE user_id = ? LIMIT 1;`;
    const userValues = [userID];
    // console.log('Fetching user role:', userID);
    const [userRows] = await db.query(userQuery, userValues);

    if (userRows.length === 0) {
      // console.log('User not found:', userID);
      return null; // User or role not found
    }

    const user = {
      userID: userRows[0].user_id,
      username: userRows[0].username,
      roleName: userRows[0].role_name,
    }

    // Next, fetch the permissions for the fetched role_name
    const roleQuery = `SELECT * FROM roles WHERE role_name = ? LIMIT 1;`;
    const roleValues = [user.roleName];
    // console.log('Fetching role permissions for role:', roleName);
    const [roleRows] = await db.query(roleQuery, roleValues);

    if (roleRows.length === 0) {
      // console.log('Role not found:', roleName);
      return null; // Role not found
    }
    // console.log("roleRows[0]:", roleRows[0])
    user.permissions = roleRows[0].permissions;
    user.editDate = roleRows[0].edit_date;
    // console.log("getRolePermissions user:", user);
    // console.log('Role permissions:', roleName, permissions);

    return user;
  } catch (error) {
    console.error('Error fetching role permissions:', error);
    throw error; // Rethrow to handle it in the calling function
  }
}


module.exports = router;