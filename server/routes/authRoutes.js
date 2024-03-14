// authRoutes.js - user registration and authentication
// List off Routes:
//   /api/auth/signup - Route for handling user registration. It extracts user information from 
//        the request, hashes the password for secure storage, and inserts the new user into 
//        the database.
//   /api/auth/signin - Route for user authentication. It retrieves the user from the database 
//        by username, compares the submitted password with the stored hashed password, and 
//        responds with user info on successful authentication or an error message on failure.
//   /api/auth/logout - Route for user logout. It expires the token cookie to invalidate the 
//        user session.
//   /api/auth/check - Route for checking if the user is authenticated. It checks for the 
//        presence of the token cookie.

// foundational imports
const express = require('express');
const router = express.Router();
const db = require('../database');

// authentication imports
const bcrypt = require('bcrypt-promise');
const jwt = require('jsonwebtoken');

// configuration import
const config = require('../config');
// pull these out of the config object
const jwtSecretKey = config.authToken.jwtSecretKey;
const tokenExpires = config.authToken.tokenExpires;
const cookieExpires = config.authCookie.cookieExpires;
const saltRounds = config.bcrypt.saltRounds;

//
// USER REGISTRATION & AUTHENTICATION
//

// Route for handling user registration. It extracts user information from the request,
// hashes the password for secure storage, and inserts the new user into the database.
// Uses bcrypt for password hashing to securely store user credentials.
router.post('/signup', async (req, res) => {
  const { username, password, firstname, lastname, email } = req.body;
  
  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Construct db query to insert user into the database
    const query = 'INSERT INTO users (username, password, firstname, lastname, email) VALUES (?, ?, ?, ?, ?)';
    const values = [username, hashedPassword, firstname, lastname, email];

    const [result] = await db.query(query, values);
    
    if (result.insertId) {
      res.send({
        username: username,
        firstname: firstname,
        lastname: lastname,
        email: email
      });
    } else {
      res.status(500).send(`Couldn't register user`);
    }
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(409).send('Username already exists');
    } else {
      console.error('Signup error:', err);
      res.status(500).send('Error during the signup process');
    }
  }
});

// Route for user authentication. It retrieves the user from the database by username,
// compares the submitted password with the stored hashed password, and
// responds with user info on successful authentication or an error message on failure.
// This showcases using bcrypt to compare hashed passwords for login verification.
router.post('/signin', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Construct db query
    const query = 'SELECT * FROM users WHERE username = ?';
    const values = [username];

    // Execute query to find user by username
    const [users] = await db.query(query, values);

    if (users.length < 1) {
      return res.status(418).send(`Username or password doesn't match any records`);
    }

    const user = users[0];
    
    // Compare the provided password with the stored hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
      // If the passwords match, generate a JWT token for the user.
      const token = jwt.sign({ userID: user.user_id, username: username }, jwtSecretKey, { expiresIn: tokenExpires });
      res.cookie('token', token, { 
        httpOnly: true, 
        expires: new Date(Date.now() + cookieExpires),
        path: '/',
        sameSite: 'Lax', // or 'Strict' based on your requirements
        // secure: true, // Uncomment if your site is served over HTTPS
      });
      res.status(200).send({ message: "Authentication successful" });
    } else {
      // If the passwords do not match, respond with an error.
      res.status(418).send(`Username or password doesn't match any records`);
    }
  } catch (err) {
    console.error('Signin error:', err);
    res.status(500).send('Error during the signin process');
  }
});

// Route for user logout. It expires the token cookie to invalidate the user session.
router.post('/logout', async (req, res) => {
  // Expire the token cookie
  res.cookie('token', '', { 
    httpOnly: true,
    expires: new Date(0),
    path: '/',
    sameSite: 'Lax', // Match the settings used when setting the cookie
    // secure: true, // Uncomment if your site is served over HTTPS
  });
  res.status(200).send({ message: 'Logged out successfully' });
});

// helper function for /check route
async function getRolePermissions(userID) {
  try {
    // First, fetch the role_name of the user
    const userQuery = `SELECT role_name FROM users WHERE user_id = ? LIMIT 1;`;
    const userValues = [userID];
    // console.log('Fetching user role:', userID);
    const [userRows] = await db.query(userQuery, userValues);

    if (userRows.length === 0) {
      // console.log('User not found:', userID);
      return null; // User or role not found
    }

    const roleName = userRows[0].role_name;

    // Next, fetch the permissions for the fetched role_name
    const roleQuery = `SELECT permissions FROM roles WHERE role_name = ? LIMIT 1;`;
    const roleValues = [roleName];
    // console.log('Fetching role permissions for role:', roleName);
    const [roleRows] = await db.query(roleQuery, roleValues);

    if (roleRows.length === 0) {
      // console.log('Role not found:', roleName);
      return null; // Role not found
    }

    const permissions = roleRows[0].permissions; // Assuming permissions are stored as JSON
    // console.log('Role permissions:', roleName, permissions);

    return {
      roleName,
      permissions,
    };
  } catch (error) {
    console.error('Error fetching role permissions:', error);
    throw error; // Rethrow to handle it in the calling function
  }
}

// Route for checking if the user is authenticated. 
router.post('/check', async (req, res) => {
  try {
    // check if the user is authenticated 
    // (if not, return error 403 and status: "not authenticated")
    // console.log("starting auth check");
    if (!req.cookies.token) {
      return res.status(403).json({ status: "not authenticated" });
    }
    // console.log("existence of cookie confirmed");
    // extract the logged in user's role from the http-only cookie
    const decoded = jwt.verify(req.cookies.token, jwtSecretKey);
    const userID = decoded.userID; 
    // console.log("cookie verified, userID:", userID);
    // fetch the row in the "roles" table matching the role
    const rolePermissions = await getRolePermissions(userID);
    if (!rolePermissions) {
      return res.status(403).json({ status: "not authorized", message: "Role not found" });
    }
    // console.log("permissions for role fetched");
    // check if the context is included in the "permissions" field
    // (if not, return error 403 and status: "not authorized")
    const pageContext = req.body.context;
    if (!rolePermissions.permissions.includes(pageContext)) {
      return res.status(403).json({ status: "not authorized", message: "Access denied to this page" });
    }
    // console.log("context and permission matched");
    // if all checks are okay, return 200
    res.status(200).json({ isAuthenticated: true, authorized: true });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(403).json({ status: "not authenticated", message: "Invalid or expired token" });
    }
    // console.error('Server error during auth check:', error);
    res.status(500).send('Server error');
  }
});


module.exports = router;