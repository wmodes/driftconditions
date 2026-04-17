// @file userRoutes.js - contains the routes for user profiles and modifying user information
// List of routes:
//   /api/user/profile - Route for showing a user's public profile
//   /api/user/profile/edit - Route to update user profile
//   /api/user/user - Route for showing another user's profile (unimplemented)
//   /api/user/disable - Route to disable a user

// foundational imports
const express = require('express');
const router = express.Router();
const logger = require('config/logger').custom('AdminServer', 'info');
const { database: db } = require('config');

// authentication imports
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt-promise');
const verifyToken = require('../middleware/authMiddleware');

// configuration import
const { config } = require('config');
const brand = require('config/brand');
const { sendTemplate, FROM } = require('../utils/mailer');
const { logAudit } = require('../utils/audit');
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
      return res.status(403).json({ error: { message: 'Permission denied.' } });
    }

    var sortArg = req.body.sort || 'user';
    const orderArg = req.body.order;
    var filterArg = req.body.filter || 'all';
    const rolenameArg = req.body.role;
    const pageArg = req.body.page ? parseInt(req.body.page, 10) : null;
    const recordsPerPage = req.body.recordsPerPage ? parseInt(req.body.recordsPerPage, 10) : null;
    const offset = pageArg && recordsPerPage ? (pageArg - 1) * recordsPerPage : null;

    const sortOptions = {
      user: { field: 'userID', order: orderArg || 'ASC' },
      username: { field: 'LOWER(username)', order: orderArg || 'ASC' },
      role: { field: 'LOWER(roleName)', order: orderArg || 'ASC' },
      date: { field: 'addedOn', order: orderArg || 'DESC' }
    };
    if (!sortOptions[sortArg]) sortArg = 'user';
    const sortCondition = sortOptions[sortArg];
    const sortColumn = sortCondition.field;
    const sortOrder = sortCondition.order;

    const filterOptions = {
      all: { query: '', values: [] },
      role: { query: 'AND roleName = ?', values: [rolenameArg] }
    };
    if (filterArg === 'role' && !rolenameArg) filterArg = 'all';
    let filterCondition = filterOptions[filterArg] || filterOptions['all'];
    let filterQuery = filterCondition.query;
    let filterValues = filterCondition.values;

    const [countResult] = await db.query(`
      SELECT COUNT(*) AS totalRecords
      FROM users
      WHERE status != "Disabled" ${filterQuery};
    `, filterValues);

    const totalRecords = countResult[0].totalRecords;

    // Only add LIMIT and OFFSET if page and recordsPerPage are provided
    let limitOffsetQuery = '';
    if (pageArg && recordsPerPage) {
      limitOffsetQuery = `LIMIT ? OFFSET ?`;
      filterValues = [...filterValues, recordsPerPage, offset];
    }

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
      ${limitOffsetQuery};
    `, filterValues);

    res.status(200).json({
      totalRecords,
      userList,
    });
  } catch (error) {
    logger.error(`userRoutes:/list: Error listing users: ${error}`);
    res.status(500).json({ error: { message: 'Server error. Try again later.' } });
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
    // Profile is public — unauthenticated users get basic fields, authenticated users get full field set
    let requestingUserInfo = null;
    try { requestingUserInfo = getRequestingUserInfo(req); } catch (e) { /* no token — public access */ }
    const requestingUsername = requestingUserInfo?.username || null;
    const permissions = requestingUserInfo?.permissions || [];
    // Get the username from the body if provided, otherwise use the requesting user's username
    const targetUsername = req.body.username || requestingUsername;
    if (!targetUsername) {
      return res.status(400).json({ error: { message: 'Username is required.' } });
    }
    logger.debug(`userRoutes:/profile: target username: ${targetUsername}`);
    // Define the fields to be returned based on the user's permission level
    const allowedFields = getAllowedFields(permissions, requestingUsername, targetUsername);
    // Determine if the edit flag should be true or false based on 'editable' field presence
    const isEditable = allowedFields.includes('editable');

    // Fetch the target user's information based on username
    let userInfo = await getUserInfo({ username: targetUsername });
    logger.debug(`userRoutes:/profile: userInfo: ${JSON.stringify(userInfo, null, 2)}`);
    if (!userInfo) {
      return res.status(404).json({ error: { message: 'User not found.' } });
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

    // Determine if the requesting user can see pending/approval content
    const isSelf = requestingUsername === targetUsername;
    const canViewExtras = isSelf || permissions.includes('viewProfileExtras');

    // Fetch profile stats for the target user
    const stats = await getProfileStats(userInfo.userID, canViewExtras);
    logger.debug(`userRoutes:/profile: stats: ${JSON.stringify(stats, null, 2)}`);

    // Respond with the user's information, stats, and the edit flag
    res.status(200).json({
      success: true,
      data: { ...userInfoReturned, stats, edit: isEditable }
    });
  } catch (error) {
    // Log the error and respond with a server error status
    logger.error(`userRoutes:/profile: Error in profile route: ${error}`);
    res.status(500).json({ error: { message: 'Server error. Try again later.' } });
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
      return res.status(403).json({ error: { message: 'Permission denied.' } });
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
    const validDBFields = ['username', 'email', 'firstname', 'lastname', 'url', 'bio', 'location', 'roleName', 'status', 'digestFrequency'];

    // Fetch current state before update — used for digest auto-adjust logic and audit before/after diff
    const [currentRows] = await db.query(
      'SELECT username, email, roleName, status, digestFrequency FROM users WHERE userID = ? LIMIT 1',
      [targetUserID]
    );
    const currentState = currentRows[0] || {};
    const { roleName: currentRole, digestFrequency: currentFreq } = currentState;

    // Prevent blanking required fields
    if (req.body.username !== undefined && req.body.username.trim() === '') {
      return res.status(400).json({ error: { message: 'Username cannot be blank.' } });
    }
    if (req.body.email !== undefined && req.body.email.trim() === '') {
      return res.status(400).json({ error: { message: 'Email cannot be blank.' } });
    }

    // Sanitize username: lowercase alphanumeric only (same rule as signup form)
    if (req.body.username !== undefined) {
      req.body.username = req.body.username.toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    // Filter out only the fields that are allowed and provided in req.body
    const queryFields = [];
    const queryValues = [];

    allowedFields.forEach(field => {
      if (validDBFields.includes(field) && req.body[field] !== undefined) {
        queryFields.push(`${field} = ?`);
        queryValues.push(req.body[field]);
      }
    });

    // Auto-adjust digestFrequency when role changes, but only if user hasn't customized it
    // (i.e. it still matches the default for their previous role)
    const roleDefaults = { user: 'yearly', contributor: 'monthly', editor: 'weekly', mod: 'daily', admin: 'daily' };
    const newRole = req.body.roleName;
    if (newRole && newRole !== currentRole && !req.body.digestFrequency) {
      const oldDefault = roleDefaults[currentRole];
      const newDefault = roleDefaults[newRole];
      if (newDefault && currentFreq === oldDefault) {
        queryFields.push('digestFrequency = ?');
        queryValues.push(newDefault);
      }
    }

    // Handle password change separately — hash before storing
    if (req.body.password && isEditable) {
      const hashedPassword = await bcrypt.hash(req.body.password, config.bcrypt.saltRounds);
      queryFields.push('password = ?');
      queryValues.push(hashedPassword);
    }

    // Ensure there's something to update
    if (queryFields.length === 0) {
      return res.status(400).json({ error: { message: 'No valid fields provided for update.' } });
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
      res.status(500).json({ error: { message: 'Error updating user profile.' } });
    } else {
      res.status(200).send({ message: 'Profile updated successfully' });

      // Audit high-value field changes — emit a separate record per change type
      const actorID = requestingUserInfo.userID;
      if (req.body.roleName && req.body.roleName !== currentState.roleName) {
        logAudit({
          tableName: 'users', recordID: targetUserID, actionType: 'role_change',
          before: { roleName: currentState.roleName },
          after:  { roleName: req.body.roleName },
          actionBy: actorID,
        });
      }
      if (req.body.status && req.body.status !== currentState.status) {
        logAudit({
          tableName: 'users', recordID: targetUserID, actionType: 'status_change',
          before: { status: currentState.status },
          after:  { status: req.body.status },
          actionBy: actorID,
        });
      }
      // Group lower-stakes field changes under a single profile_edit record
      const editedFields = ['username', 'email', 'digestFrequency'].filter(
        f => req.body[f] !== undefined && req.body[f] !== currentState[f]
      );
      if (editedFields.length > 0) {
        logAudit({
          tableName: 'users', recordID: targetUserID, actionType: 'profile_edit',
          before: Object.fromEntries(editedFields.map(f => [f, currentState[f]])),
          after:  Object.fromEntries(editedFields.map(f => [f, req.body[f]])),
          actionBy: actorID,
        });
      }
      if (req.body.password) {
        // Don't log the password value — just that it changed
        logAudit({
          tableName: 'users', recordID: targetUserID, actionType: 'password_change',
          actionBy: actorID,
        });
      }

      // Send role-change notification if roleName changed and notifyUser is set
      const newRole = req.body.roleName;
      const notifyUser = req.body.notifyUser;
      if (newRole && notifyUser) {
        const roleTemplates = {
          contributor: 'role-change-contributor',
          editor:      'role-change-editor',
          mod:         'role-change-mod',
        };
        const template = roleTemplates[newRole.toLowerCase()];
        if (template) {
          // Fetch the target user's email and firstname for the notification
          const [rows] = await db.query(
            'SELECT firstname, username, email FROM users WHERE userID = ? LIMIT 1',
            [targetUserID]
          );
          if (rows.length > 0) {
            const { firstname, username, email } = rows[0];
            sendTemplate(template, {
              firstname: firstname || username,
              username,
            }, { to: email, from: FROM.welcome }).catch((err) => {
              logger.error(`userRoutes:/profile/edit: role-change email failed for ${username}: ${err.message}`);
            });
          }
        }
      }
    }
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: { message: 'Username already taken.' } });
    }
    logger.error(`userRoutes:/edit: Update failed: ${error}`);
    res.status(500).json({ error: { message: 'Server error. Try again later.' } });
  }
});

/**
 * One-click unsubscribe from digest emails via signed JWT link.
 * Sets digestFrequency = 'nodigest' for the user. No auth required —
 * the signed token in the URL is sufficient proof of identity.
 * @route GET /unsubscribe
 * @access Public (token-gated)
 */
router.get('/unsubscribe', async (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.status(400).send('Missing unsubscribe token.');
  }
  try {
    const decoded = jwt.verify(token, jwtSecretKey);
    if (decoded.purpose !== 'unsubscribe' || !decoded.userID) {
      return res.status(400).send('Invalid unsubscribe token.');
    }
    await db.query(
      `UPDATE users SET digestFrequency = 'nodigest' WHERE userID = ?`,
      [decoded.userID]
    );
    logger.info(`userRoutes:/unsubscribe: userID ${decoded.userID} unsubscribed from digest`);
    res.send(`
      <html><body style="font-family:Georgia,serif;max-width:480px;margin:4em auto;color:#333;text-align:center;">
        <p style="font-size:1.2em;">You've been unsubscribed from digest emails.</p>
        <p style="color:#888;font-size:0.9em;">You can re-enable digests at any time from your profile settings.</p>
      </body></html>
    `);
  } catch (err) {
    logger.error(`userRoutes:/unsubscribe: ${err.message}`);
    res.status(400).send('Unsubscribe link is invalid or has expired.');
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
    return res.status(403).json({ error: { message: 'Permission denied.' } });
  }

  const { userID } = req.body;
  logger.debug(`userRoutes:/disable: userID: ${userID}`);
  if (!userID) {
    return res.status(400).json({ error: { message: 'User ID is required.' } });
  }
  try {
    // Fetch current status before disabling — needed for audit before/after diff
    const [currentRows] = await db.query('SELECT status FROM users WHERE userID = ? LIMIT 1', [userID]);
    const currentStatus = currentRows[0]?.status || null;

    const query = `UPDATE users SET status = 'Disabled' WHERE userID = ?`;
    const values = [userID];
    const [result] = await db.query(query, values);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: { message: 'User not found.' } });
    }
    res.status(200).json({ message: 'User disabled successfully' });
    logAudit({
      tableName: 'users', recordID: userID, actionType: 'status_change',
      before: { status: currentStatus },
      after:  { status: 'Disabled' },
      actionBy: requestingUserInfo.userID,
    });
  } catch (error) {
    logger.error(`userRoutes:/disable: Error disabling user: ${error}`);
    res.status(500).json({ error: { message: 'Server error. Try again later.' } });
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
/**
 * Fetch contribution stats for a user profile.
 * @param {number} userID - The target user's ID.
 * @param {boolean} canViewExtras - Whether to include pending/approval data.
 * @returns {Object} - Stats object with counts, totals, top clips, and optionally pending clips.
 */
async function getProfileStats(userID, canViewExtras) {
  // Audio counts + totals
  const [[audioRow]] = await db.query(
    `SELECT COUNT(*) AS total,
            SUM(status = 'Review') AS pending,
            SUM(COALESCE(timesUsed, 0)) AS totalPlays,
            MAX(createDate) AS lastContributed
     FROM audio WHERE creatorID = ?`,
    [userID]
  );

  // Recipe counts
  const [[recipeRow]] = await db.query(
    `SELECT COUNT(*) AS total,
            SUM(status = 'Review') AS pending
     FROM recipes WHERE creatorID = ?`,
    [userID]
  );

  // Top played audio (top 5)
  const [topPlays] = await db.query(
    `SELECT audioID, title, timesUsed
     FROM audio WHERE creatorID = ? AND status = 'Approved'
     ORDER BY timesUsed DESC LIMIT 5`,
    [userID]
  );

  // Pending audio list (most recent 3) — extras only
  let recentPending = [];
  if (canViewExtras) {
    const [rows] = await db.query(
      `SELECT audioID, title, createDate
       FROM audio WHERE creatorID = ? AND status = 'Review'
       ORDER BY createDate DESC LIMIT 3`,
      [userID]
    );
    recentPending = rows;
  }

  // Recently played audio (most recent 3 by lastUsed)
  const [recentPlayed] = await db.query(
    `SELECT audioID, title, lastUsed
     FROM audio WHERE creatorID = ? AND lastUsed IS NOT NULL
     ORDER BY lastUsed DESC LIMIT 3`,
    [userID]
  );

  return {
    general: {
      lastContributed: audioRow.lastContributed || null,
    },
    audio: {
      contributed: audioRow.total || 0,
      totalPlays: parseInt(audioRow.totalPlays, 10) || 0,
      ...(canViewExtras && { pending: audioRow.pending || 0 }),
      topPlays,
      recentPlayed,
      ...(canViewExtras && { recentPending }),
    },
    recipes: {
      contributed: recipeRow.total || 0,
      ...(canViewExtras && { pending: recipeRow.pending || 0 }),
    },
  };
}

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
      return ['userID', 'username', 'status', 'email', 'firstname', 'lastname', 'email', 'url', 'bio', 'location', 'roleName', 'addedOn', 'avatar_url', 'digestFrequency', 'editable'];
    case "self":
      // Return everything except password, and replacing roleName with roleNameShow, adding 'editable' field
      return ['userID', 'username', 'statusShow', 'email', 'firstname', 'lastname', 'email', 'url', 'bio', 'location', 'roleNameShow', 'addedOn', 'avatar_url', 'digestFrequency', 'editable'];
    case "basic":
    default:
      return ['userID', 'username', 'firstname', 'lastname', 'url', 'bio', 'location', 'roleNameShow', 'addedOn', 'avatar_url'];
  }
};

module.exports = router;
