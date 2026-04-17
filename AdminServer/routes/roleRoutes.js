// roleRoutes - routes for managing user roles

// foundational imports
const express = require('express');
const router = express.Router();
const logger = require('config/logger').custom('AdminServer', 'info');
const { database: db } = require('config');

// authentication imports
const jwt = require('jsonwebtoken');
const verifyToken = require('../middleware/authMiddleware');

// configuration import
const { config } = require('config');
// pull these out of the config object
const jwtSecretKey = config.authToken.jwtSecretKey;

const { logAudit } = require('../utils/audit');

router.post('/list', verifyToken, async (req, res) => {
  try {
    // Since there's no sorting or pagination, the query is straightforward
    const query = `
      SELECT 
        roleID,
        roleName,
        permissions,
        comments
      FROM roles;
    `;

    const [rolesList] = await db.query(query);

    res.status(200).json({
      roles: rolesList,
    });
  } catch (error) {
    logger.error(`roleRoutes:/list: Error listing roles: ${error}`);
    res.status(500).json({ error: { message: 'Server error. Try again later.' } });
  }
});

router.post('/update', verifyToken, async (req, res) => {
  // Require roleList permission — only admins have this; role edits are high-privilege
  const requestingUserInfo = jwt.verify(req.cookies.token, jwtSecretKey);
  if (!requestingUserInfo?.permissions?.includes('roleList')) {
    return res.status(403).json({ error: { message: 'Permission denied.' } });
  }
  const record = req.body;
  try {
    // Fetch current role state before update — needed for audit before/after diff
    const [currentRows] = await db.query(
      'SELECT roleName, permissions, comments FROM roles WHERE roleID = ? LIMIT 1',
      [record.roleID]
    );
    const before = currentRows[0] || null;

    // SQL query to update role information
    const query = `
      UPDATE roles
      SET
        roleName = ?,
        permissions = ?,
        comments = ?,
        editDate = NOW()
      WHERE roleID = ?;
    `;
    const values = [
      record.roleName,
      JSON.stringify(record.permissions),
      record.comments,
      record.roleID
    ];

    // Execute the query
    const [result] = await db.query(query, values);
    if (!result.affectedRows) {
      logger.error('roleRoutes:/update: Error updating role: No rows affected');
      res.status(404).json({ error: { message: 'Role not found or no changes made.' } });
    } else {
      res.status(200).json({ message: 'Role updated successfully' });
      logAudit({
        tableName: 'roles',
        recordID: record.roleID,
        actionType: 'role_permissions_change',
        before: { roleName: before?.roleName, permissions: before?.permissions, comments: before?.comments },
        after:  { roleName: record.roleName, permissions: record.permissions, comments: record.comments },
        actionBy: requestingUserInfo.userID,
      });
    }
  } catch (error) {
    logger.error(`roleRoutes:/update: Error in /role/update route: ${error}`);
    res.status(500).json({ error: { message: 'Server error. Try again later.' } });
  }
});

module.exports = router;