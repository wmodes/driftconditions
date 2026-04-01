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
const logger = require('config/logger').custom('AdminServer', 'debug');
const { database: db } = require('config');

// authentication imports
const bcrypt = require('bcrypt-promise');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// configuration import
const { config } = require('config');
// pull these out of the config object
const jwtSecretKey = config.authToken.jwtSecretKey;
const tokenExpires = config.authToken.tokenExpires;
const cookieExpires = config.authCookie.cookieExpires;
const tokenRefresh = config.authToken.tokenRefresh;
const saltRounds = config.bcrypt.saltRounds;
const recaptchaSecretKey = config.recaptcha.secretKey;
const recaptchaScoreThreshold = config.recaptcha.scoreThreshold;
const googleClientId = config.google.clientId;
const googleClientSecret = config.google.clientSecret;
const googleCallbackUrl = config.google.callbackUrl;
const clientUrl = config.client.url;

// helper: verify reCAPTCHA v3 token with Google
// returns the score (0.0-1.0) or throws on failure
async function verifyRecaptcha(token) {
  const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `secret=${recaptchaSecretKey}&response=${token}`,
  });
  const data = await response.json();
  logger.debug(`authRoutes:verifyRecaptcha: success=${data.success}, score=${data.score}`);
  if (!data.success) throw new Error('reCAPTCHA verification failed');
  return data.score;
}

//
// USER REGISTRATION & AUTHENTICATION
//

// Route for handling user registration. It extracts user information from the request,
// hashes the password for secure storage, and inserts the new user into the database.
// Uses bcrypt for password hashing to securely store user credentials.
router.post('/signup', async (req, res) => {
  const { username, password, firstname, lastname, location, email, recaptchaToken } = req.body;

  try {
    // Verify reCAPTCHA token if provided
    if (recaptchaToken) {
      const score = await verifyRecaptcha(recaptchaToken);
      if (score < recaptchaScoreThreshold) {
        return res.status(403).send('reCAPTCHA score too low, request blocked');
      }
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Construct db query to insert user into the database
    const query = 'INSERT INTO users (username, password, firstname, lastname, location, email) VALUES (?, ?, ?, ?, ?, ?)';
    const values = [username, hashedPassword, firstname, lastname, location, email];

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
      logger.error(`authRoutes:/signup: Signup error: ${err}`);
      res.status(500).send('Error during the signup process');
    }
  }
});

// Route for user authentication. It retrieves the user from the database by username,
// compares the submitted password with the stored hashed password, and
// responds with user info on successful authentication or an error message on failure.
// This showcases using bcrypt to compare hashed passwords for login verification.
router.post('/signin', async (req, res) => {
  try {
    const { username, password, recaptchaToken } = req.body;

    // Verify reCAPTCHA token if provided
    if (recaptchaToken) {
      const score = await verifyRecaptcha(recaptchaToken);
      if (score < recaptchaScoreThreshold) {
        return res.status(403).send('reCAPTCHA score too low, request blocked');
      }
    }
    // Construct db query
    const query = 'SELECT * FROM users WHERE username = ?';
    const values = [username];

    // Execute query to find user by username
    const [users] = await db.query(query, values);
    // logger.debug("authRoutes:/signin: users:", users);

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
    logger.error(`authRoutes:/signin: Signin error: ${err}`);
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
    sameSite: 'None', // or 'Strict' based on your requirements
    secure: true, // Uncomment if your site is served over HTTPS
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
    sameSite: 'None', // Match the settings used when setting the cookie
    secure: true, // Uncomment if your site is served over HTTPS
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
      logger.debug("authRoutes:/check: no token found");
    }
    // fetch the row in the "roles" table matching the role
    const user = await getRolePermissions(tokenData ? tokenData.userID : null);
    // logger.debug(`authRoutes:/check: user: ${user}`);
    if (!user) {
      return res.status(403).json({ 
        error: {
          code: 403,
          reason: "not_authorized",
          message: "Role not found"
        }
      });
    }
    logger.debug("authRoutes:/check: user:", user);

    // if user.editDate (which is really the role permisssions edit date) 
    // is after the token's issuedAt date, then issue a new token 
    // with the updated permissions
    if (tokenData) {
      const oneHourFromNow = new Date(Date.now() + tokenRefresh); // 1 hour from now
      if (user.editDate > tokenData.issuedAt || tokenData.expiresAt <= oneHourFromNow) {
        logger.debug("authRoutes:/check: role permissions have been updated or token expires within 1 hour");
        const token = issueNewToken(res, user);
        logger.debug("authRoutes:/check: new token issued");
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
    logger.debug("authRoutes:/check: context and permission matched");
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
    logger.error(`authRoutes:/check: Server error during auth check: ${error}`);
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
    logger.error(`authRoutes:decodeToken: Error decoding token: ${error}`);
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
      logger.debug("authRoutes:getRolePermissions: roleRows:", roleRows);
      if (roleRows.length === 0) {
        logger.debug(`authRoutes:getRolePermissions: Role not found: ${roleName}`);
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
    logger.debug(`authRoutes:getRolePermissions: Fetching user role: ${userID}`);
    const [userRows] = await db.query(userQuery, userValues);

    if (userRows.length === 0) {
      logger.error(`authRoutes:getRolePermissions: User not found: ${userID}`);
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
    logger.debug(`authRoutes:getRolePermissions: Fetching role permissions for role: ${user.roleName}`);
    const [roleRows] = await db.query(roleQuery, roleValues);

    if (roleRows.length === 0) {
      logger.error(`authRoutes:getRolePermissions: Role not found: ${roleName}`);
      return null; // Role not found
    }
    logger.debug(`authRoutes:getRolePermissions: roleRows[0]: ${JSON.stringify(roleRows[0])}`);
    user.permissions = roleRows[0].permissions;
    user.editDate = roleRows[0].editDate;
    user.roleName = roleRows[0].roleName;
    logger.debug(`authRoutes:getRolePermissions: user: ${user}`);
    logger.debug(`authRoutes:getRolePermissions: user.permissions: ${user.roleName, user.permissions}`);

    return user;
  } catch (error) {
    logger.error(`authRoutes:getRolePermissions: Error fetching role permissions: ${error}`);
    throw error; // Rethrow to handle it in the calling function
  }
}


// OAuth callback route — handles provider redirect after user authenticates
// GET /api/auth/callback/:provider
router.get('/callback/:provider', async (req, res) => {
  const provider = req.params.provider;
  // clientUrl is where the frontend is served (separate from the API server)
  const clientOrigin = clientUrl;

  try {
    // 1. Validate CSRF state
    const returnedState = req.query.state;
    const storedState = req.cookies.oauth_state;
    if (!returnedState || !storedState || returnedState !== storedState) {
      logger.error('authRoutes:/callback: CSRF state mismatch');
      return res.redirect(`${clientOrigin}/signin?error=INVALID_STATE`);
    }
    res.clearCookie('oauth_state', { path: '/', sameSite: 'Lax', secure: true });

    const { discovery, authorizationCodeGrant } = await import('openid-client');

    // Google uses OIDC discovery
    const issuerUrl = new URL('https://accounts.google.com');
    const oidcConfig = await discovery(issuerUrl, googleClientId, googleClientSecret);

    // Build the full callback URL (openid-client extracts code/state from it)
    // Must use the API server origin, not the frontend client URL
    const apiOrigin = new URL(googleCallbackUrl).origin;
    const currentUrl = new URL(req.originalUrl, apiOrigin);

    // Exchange code for tokens; also validates state
    const tokens = await authorizationCodeGrant(oidcConfig, currentUrl, {
      expectedState: storedState,
    });

    // 2. Extract profile from ID token claims
    const claims = tokens.claims();
    const oauthId = String(claims.sub);
    const email = claims.email;
    const displayName = claims.name || email.split('@')[0];
    logger.debug(`authRoutes:/callback: provider=${provider}, email=${email}, oauthId=${oauthId}`);

    // 3. Resolve user: check userIdentities → check email → create new
    let user = null;
    let isNewUser = false;

    const [identityRows] = await db.query(
      `SELECT ui.userId, u.username, u.roleName, u.firstname, u.lastname, u.displayName
       FROM userIdentities ui JOIN users u ON u.userID = ui.userId
       WHERE ui.oauthProvider = ? AND ui.oauthId = ?`,
      [provider, oauthId]
    );

    if (identityRows.length > 0) {
      // Existing OAuth user
      user = { userID: identityRows[0].userId, username: identityRows[0].username, roleName: identityRows[0].roleName };
      // Fill in any blank name fields from provider data without overwriting existing values
      await fillBlankNameFields(user.userID, identityRows[0], displayName);
      logger.debug(`authRoutes:/callback: existing OAuth user: ${user.username}`);
    } else {
      const [emailRows] = await db.query(
        'SELECT userID, username, roleName, firstname, lastname, displayName FROM users WHERE email = ? LIMIT 1',
        [email]
      );

      if (emailRows.length > 0) {
        // Existing local user — link new OAuth identity
        user = { userID: emailRows[0].userID, username: emailRows[0].username, roleName: emailRows[0].roleName };
        await db.query(
          'INSERT INTO userIdentities (userId, oauthProvider, oauthId) VALUES (?, ?, ?)',
          [user.userID, provider, oauthId]
        );
        // Fill in any blank name fields from provider data without overwriting existing values
        await fillBlankNameFields(user.userID, emailRows[0], displayName);
        logger.debug(`authRoutes:/callback: linked ${provider} to existing user: ${user.username}`);
      } else {
        // Brand new user — create account
        isNewUser = true;
        const username = await generateUniqueUsername(email);
        // Split displayName into firstname/lastname (both NOT NULL), split on last space
        const lastSpace = displayName.lastIndexOf(' ');
        const firstname = lastSpace > 0 ? displayName.slice(0, lastSpace) : displayName;
        const lastname  = lastSpace > 0 ? displayName.slice(lastSpace + 1) : null;
        // Password placeholder — long random string, not usable for local login
        const passwordPlaceholder = crypto.randomBytes(32).toString('hex');

        const [insertResult] = await db.query(
          'INSERT INTO users (username, password, email, firstname, lastname, displayName, lastLoginAt) VALUES (?, ?, ?, ?, ?, ?, NOW())',
          [username, passwordPlaceholder, email, firstname, lastname, displayName]
        );
        user = { userID: insertResult.insertId, username, roleName: 'user' };
        await db.query(
          'INSERT INTO userIdentities (userId, oauthProvider, oauthId) VALUES (?, ?, ?)',
          [user.userID, provider, oauthId]
        );
        logger.debug(`authRoutes:/callback: created new user: ${username}`);
      }
    }

    // 4. Update lastLoginAt
    await db.query('UPDATE users SET lastLoginAt = NOW() WHERE userID = ?', [user.userID]);

    // 5. Fetch role permissions
    const [roleRows] = await db.query(
      'SELECT permissions FROM roles WHERE roleName = ? LIMIT 1',
      [user.roleName]
    );
    user.permissions = roleRows[0]?.permissions || '';

    // 6. Issue JWT cookie
    issueNewToken(res, user);

    // 7. Redirect — new users go to profile edit, existing users go to their profile
    if (isNewUser) {
      res.redirect(`${clientOrigin}/profile/edit`);
    } else {
      res.redirect(`${clientOrigin}/profile/${user.username}`);
    }

  } catch (err) {
    logger.error(`authRoutes:/callback: OAuth callback error: ${err}`);
    res.redirect(`${clientOrigin}/signin?error=OAUTH_EXCHANGE_FAILED`);
  }
});

// helper: update blank name fields for existing users from OAuth provider data
// never overwrites fields that already have a value
async function fillBlankNameFields(userID, existingUser, providerDisplayName) {
  const lastSpace = providerDisplayName.lastIndexOf(' ');
  const providerFirstname = lastSpace > 0 ? providerDisplayName.slice(0, lastSpace) : providerDisplayName;
  const providerLastname  = lastSpace > 0 ? providerDisplayName.slice(lastSpace + 1) : null;

  const updates = {};
  if (!existingUser.displayName) updates.displayName = providerDisplayName;
  if (!existingUser.firstname)   updates.firstname   = providerFirstname;
  if (!existingUser.lastname)    updates.lastname     = providerLastname;

  if (Object.keys(updates).length > 0) {
    const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(updates), userID];
    await db.query(`UPDATE users SET ${setClauses} WHERE userID = ?`, values);
    logger.debug(`authRoutes:fillBlankNameFields: updated ${Object.keys(updates).join(', ')} for userID=${userID}`);
  }
}

// helper: generate a username from email prefix, with uniqueness check
async function generateUniqueUsername(email) {
  const base = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() || 'user';
  let username = base;
  let counter = 1;
  while (true) {
    const [rows] = await db.query('SELECT userID FROM users WHERE username = ? LIMIT 1', [username]);
    if (rows.length === 0) break;
    username = `${base}${counter++}`;
  }
  return username;
}


// OAuth init route — redirects browser to provider's auth page
// GET /api/auth/:provider (google or github)
router.get('/:provider', async (req, res) => {
  const provider = req.params.provider;
  if (!['google', 'github'].includes(provider)) {
    return res.status(400).json({ error: 'Unknown provider' });
  }

  try {
    const { discovery, buildAuthorizationUrl } = await import('openid-client');

    // Google supports OIDC discovery; GitHub does not (handled in callback step)
    const issuerUrl = new URL('https://accounts.google.com');
    const oidcConfig = await discovery(issuerUrl, googleClientId, googleClientSecret);

    // Generate CSRF state and store in short-lived cookie
    const state = crypto.randomBytes(16).toString('hex');
    res.cookie('oauth_state', state, {
      httpOnly: true,
      maxAge: 10 * 60 * 1000, // 10 minutes
      path: '/',
      sameSite: 'Lax',
      secure: true,
    });

    const authUrl = buildAuthorizationUrl(oidcConfig, {
      redirect_uri: googleCallbackUrl,
      scope: 'openid email profile',
      state,
    });

    logger.debug(`authRoutes:/:provider: redirecting to ${provider} auth`);
    res.redirect(authUrl.href);
  } catch (err) {
    logger.error(`authRoutes:/:provider: OAuth init error: ${err}`);
    res.status(500).send('OAuth initialization failed');
  }
});


module.exports = router;