// roleRoutes - routes for managing user roles

// foundational imports
const express = require('express');
const router = express.Router();
const db = require('../config/database');

// authentication imports
const jwt = require('jsonwebtoken');
const verifyToken = require('../middleware/authMiddleware');

// configuration import
const config = require('../config/config');
// pull these out of the config object
const jwtSecretKey = config.authToken.jwtSecretKey;

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
    console.error('Error listing roles:', error);
    res.status(500).send('Server error during roles list retrieval');
  }
});

router.post('/update', verifyToken, async (req, res) => {
  const record = req.body;
  try {
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
      console.error('Error updating role: No rows affected');
      res.status(404).send('Role not found or no changes made');
    } else {
      res.status(200).json({ message: 'Role updated successfully' });
    }
  } catch (error) {
    console.error('Error in /role/update route:', error);
    res.status(500).send('Server error during role update');
  }
});

module.exports = router;