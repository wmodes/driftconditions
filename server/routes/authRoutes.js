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

// Route for checking if the user is authenticated. It checks for the presence of the token cookie.
router.post('/check', async (req, res) => {
  try {
    if (req.cookies.token) {
      const decoded = jwt.verify(req.cookies.token, jwtSecretKey);
      const userID = decoded.userID;
      const username = decoded.username;
      res.status(200).json({ isAuthenticated: true, userID, username });
    } else {
      res.status(200).json({ isAuthenticated: false });
    }
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(500).send('Server error');
  }
});


module.exports = router;