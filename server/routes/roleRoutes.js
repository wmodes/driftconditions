// roleRoutes - routes for managing user roles

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

router.post('/list', verifyToken, async (req, res) => {
  try {
    // Since there's no sorting or pagination, the query is straightforward
    const query = `
      SELECT 
        role_id,
        role_name,
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
  const { role_id, role_name, permissions, comments } = req.body;
  // console.log('Request to update role:', { role_id, role_name, permissions, comments });

  try {
    // Convert permissions back to a string if it's not already, assuming your database expects a JSON string
    // This conversion is necessary only if your database expects a stringified JSON for the permissions field
    const permissionsStr = typeof permissions === 'string' ? permissions : JSON.stringify(permissions);

    // SQL query to update role information
    const query = `
      UPDATE roles 
      SET role_name = ?, permissions = ?, comments = ?, edit_date = NOW()
      WHERE role_id = ?;
    `;
    const values = [role_name, permissionsStr, comments, role_id];

    // Execute the query
    const [result] = await db.query(query, values);
    if (!result.affectedRows) {
      console.error('Error updating role: No rows affected');
      res.status(404).send('Role not found or no changes made');
    } else {
      res.status(200).json({ message: 'Role updated successfully', role_id, role_name, permissions: permissionsStr, comments });
    }
  } catch (error) {
    console.error('Error in /role/update route:', error);
    res.status(500).send('Server error during role update');
  }
});

module.exports = router;