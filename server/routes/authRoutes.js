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
const bcrypt = require('bcrypt');
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
router.post('/signup', (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  const firstname = req.body.firstname;
  const lastname = req.body.lastname;
  const email = req.body.email;
  //TODO: Abstract the hashing and storing of user details into a separate function
  // Extracting and hashing user password, then storing user details in the database.
  // Responds with user info on success or error message on failure.
  bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
    if (err) {
      res.status(418).send(`Couldn't hash the password`); 
    } else {
      // Construct db query to insert user into the database
      const query = 'INSERT INTO users (username, password, firstname, lastname, email) VALUES (?, ?, ?, ?, ?)';
      const values = [username, hashedPassword, firstname, lastname, email];
      db.query(query, values, (err, result) => {  
        if (err) {
          res.status(418).send(`Couldn't register user`); 
        } else {  
          res.send({
            username: username,
            firstname: firstname,
            lastname: lastname,
            email: email
          });
        }
      })
    }
  })
})

// Route for user authentication. It retrieves the user from the database by username,
// compares the submitted password with the stored hashed password, and
// responds with user info on successful authentication or an error message on failure.
// This showcases using bcrypt to compare hashed passwords for login verification.
router.post('/signin', (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  // Construct db query
  const query = 'SELECT * FROM users WHERE username = ?';
  const values = [username];
  // Authenticating user by comparing hashed password, showcasing secure login mechanism.
  db.query(query, values, (err, result) => {
    if (err) {
      res.status(500).send(err.message);
    } else if (result.length < 1) {
      res.status(418).send(`Username or password doesn't match any records`);  
    } else {
      bcrypt.compare(password, result[0].password, (err, isMatch) => {
        if (err) {
          res.status(500).send(err.message);
        } else if (isMatch) {
          // If the passwords match, generate a JWT token for the user.
          const token = jwt.sign({ userID: result[0].user_id }, jwtSecretKey, { expiresIn: tokenExpires });
          res.cookie('token', token, { 
            httpOnly: true, 
            expires: new Date(Date.now() + cookieExpires),
            path: '/',
            sameSite: 'Lax', // or 'Strict' based on your requirements
            // secure: true, // Uncomment if your site is served over HTTPS
          }); // 6h expiration
          res.status(200).send({message: "Authentication successful"});
        } else {  
          // If the passwords do not match, respond with an error.
          res.status(418).send(`Username or password doesn't match any records`);
        }
      })
    }
  })
})

// Route for user logout. It expires the token cookie to invalidate the user session.
router.post('/logout', (req, res) => {
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
router.post('/check', (req, res) => {
  if (req.cookies.token) {
    res.status(200).json({ isAuthenticated: true });
  } else {
    res.status(200).json({ isAuthenticated: false });
  }
});

module.exports = router;