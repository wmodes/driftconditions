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
const logger = require('config/logger');
const { database: db } = require('config');

// authentication imports
const bcrypt = require('bcrypt-promise');
const jwt = require('jsonwebtoken');

// configuration import
const { config } = require('config');
// pull these out of the config object
const jwtSecretKey = config.authToken.jwtSecretKey;
const tokenExpires = config.authToken.tokenExpires;
const cookieExpires = config.authCookie.cookieExpires;
const tokenRefresh = config.authToken.tokenRefresh;
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
    logger.debug("users:", users);

    // no user found
    if (users.length < 1) {
      return res.status(418).send(`Username or password doesn't match any records`);
    }

    // get data from user db query
    const user = {
      userID: users[0].userID,
      username: users[0].username,
      roleName: users[0].roleName,
      hashedPassword: users[0].password
    }

    // get role permissions
    const roleQuery = 'SELECT permissions FROM roles WHERE roleName = ?';
    const roleValues = [user.roleName];
    const [roles] = await db.query(roleQuery, roleValues);
    user.permissions = roles[0].permissions;
    
    // Compare the provided password with the stored hashed password
    const isMatch = await bcrypt.compare(password, user.hashedPassword);
    if (isMatch) {
      // If the passwords match, generate a JWT token for the user.
      issueNewToken(res, user);
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

// helper: issue a new token
// expects:
//   res: the response object
//   user: an object with user data: {userID, username, permissions}
const issueNewToken = (res, user) => {
  const token = jwt.sign(
    { 
      userID: user.userID, 
      username: user.username, 
      permissions: user.permissions 
    },
    jwtSecretKey, 
    { expiresIn: tokenExpires } // jwt.sign expects seconds
  );
  
  res.cookie('token', token, {
    httpOnly: true,
    expires: new Date(Date.now() + cookieExpires),
    path: '/',
    sameSite: 'Lax', // or 'Strict' based on your requirements
    // secure: true, // Uncomment if your site is served over HTTPS
  });

  return token; // Return the token if needed elsewhere, otherwise, this line can be omitted
};

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

// Route for checking if the user is authenticated. 
router.post('/check', async (req, res) => {
  let tokenData = null;
  try {
    // check if the user is authenticated 
    if (req.cookies.token) {
      tokenData = await decodeToken(req.cookies.token);
    } else {
      logger.debug("no token found");
    }
    // fetch the row in the "roles" table matching the role
    const user = await getRolePermissions(tokenData ? tokenData.userID : null);
    logger.debug(`authRoutes:/check: user: ${user}`);
    if (!user) {
      return res.status(403).json({ 
        error: {
          code: 403,
          reason: "not_authorized",
          message: "Role not found"
        }
      });
    }
    logger.debug("user:", user);

    // if user.editDate (which is really the role permisssions edit date) 
    // is after the token's issuedAt date, then issue a new token 
    // with the updated permissions
    if (tokenData) {
      const oneHourFromNow = new Date(Date.now() + tokenRefresh); // 1 hour from now
      if (user.editDate > tokenData.issuedAt || tokenData.expiresAt <= oneHourFromNow) {
        logger.debug("role permissions have been updated or token expires within 1 hour");
        const token = issueNewToken(res, user);
        logger.debug("new token issued");
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
    logger.debug("context and permission matched");
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
// Fetch the roleName and permissions for the user
async function getRolePermissions(userID) {
  try {
    if (!userID) {
      // Handle 'noauth' permissions logic here
      // Example:
      const roleQuery = `SELECT * FROM roles WHERE roleName = ? LIMIT 1;`;
      const roleValues = 'noauth';
      const [roleRows] = await db.query(roleQuery, roleValues);
      logger.debug("roleRows:", roleRows);
      if (roleRows.length === 0) {
        logger.debug('Role not found:', roleName);
        return null; // Role not found
      }
      const user = {
        userID: null,
        username: null,
        roleName: roleRows[0].roleName,
        permissions: roleRows[0].permissions,
        editDate: roleRows[0].editDate
      }
      return user;
    }
    // First, fetch the roleName of the user
    const userQuery = `SELECT * FROM users WHERE userID = ? LIMIT 1;`;
    const userValues = [userID];
    logger.debug('Fetching user role:', userID);
    const [userRows] = await db.query(userQuery, userValues);

    if (userRows.length === 0) {
      logger.debug('User not found:', userID);
      return null; // User or role not found
    }

    const user = {
      userID: userRows[0].userID,
      username: userRows[0].username,
      roleName: userRows[0].roleName,
    }

    // Next, fetch the permissions for the fetched roleName
    const roleQuery = `SELECT * FROM roles WHERE roleName = ? LIMIT 1;`;
    const roleValues = [user.roleName];
    logger.debug('Fetching role permissions for role:', roleName);
    const [roleRows] = await db.query(roleQuery, roleValues);

    if (roleRows.length === 0) {
      logger.debug('Role not found:', roleName);
      return null; // Role not found
    }
    logger.debug("roleRows[0]:", roleRows[0])
    user.permissions = roleRows[0].permissions;
    user.editDate = roleRows[0].editDate;
    logger.debug("getRolePermissions user:", user);
    logger.debug('Role permissions:', roleName, permissions);

    return user;
  } catch (error) {
    console.error('Error fetching role permissions:', error);
    throw error; // Rethrow to handle it in the calling function
  }
}


module.exports = router;