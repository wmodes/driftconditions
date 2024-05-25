// recipeRoutes.js - This file contains the routes for recipe management.

const express = require('express');
const router = express.Router();
const logger = require('config/logger').custom('AdminServer', 'info');
const { database: db } = require('config');
const { parse: JSONparse, stringify: JSONstringify } = require('comment-json');

const jwt = require('jsonwebtoken');
const verifyToken = require('../middleware/authMiddleware');

const { config } = require('config');
const jwtSecretKey = config.authToken.jwtSecretKey;

//
// RECIPE FETCHING AND LISTING
//
//

// Route to fetch recipe info
//
router.post('/info', verifyToken, async (req, res) => {
  const { recipeID } = req.body;
  if (!recipeID) {
    return res.status(400).send('Recipe ID is required');
  }
  try {
    const query = `
    SELECT 
      recipes.*, 
      creator.username AS creatorUsername,
      editor.username AS editorUsername 
    FROM recipes
    JOIN users AS creator ON recipes.creatorID = creator.userID
    LEFT JOIN users AS editor ON recipes.editorID = editor.userID
    WHERE recipes.recipeID = ?;`;
    const values = [recipeID];
    
    const [result] = await db.query(query, values);
    if (result.length === 0) {
      return res.status(404).send('Recipe not found');
    }
    record = result[0];
    // Attempt to repair broken JSON fields (recipeData, classification, tags)
    // record.recipeData = repairBrokenJSON(record.recipeData);
    record.classification = repairBrokenJSON(record.classification);
    record.tags = repairBrokenJSON(record.tags);
    // Respond with the fetched data
    res.status(200).json(record);
  } catch (error) {
    logger.error(`recipeRoutes:/info: Error fetching recipe info: ${error}`);
    res.status(500).send('Server error during recipe info retrieval');
  }
});

// Route to list recipes
//
router.post('/list', verifyToken, async (req, res) => {
  try {
    const sort = req.body.sort || 'date';
    const order = req.body.order === 'ASC' ? 'ASC' : 'DESC';
    const filter = req.body.filter || 'all';
    const targetID = req.body.targetID || req.user.userID;
    const page = parseInt(req.body.page || 1, 10);
    const recordsPerPage = parseInt(req.body.recordsPerPage || 20, 10);
    const offset = (page - 1) * recordsPerPage;

    const sortOptions = {
      id: 'recipeID',
      title: 'LOWER(title)',
      status: 'LOWER(status)',
      author: 'creatorID', 
      date: 'createDate',
    };
    const sortColumn = sortOptions[sort] || 'createDate';

    // Define filter options
    const filterOptions = {
      all : {
        query: 'AND a.status != ?', 
        values: ['Trashed']
      },
      user: {
        query: 'AND a.creatorID = ? AND a.status != ?',
        values: [targetID, 'Trashed'] 
      },
      trash: {
        query: 'AND a.status = ?',
        values: ['Trashed']
      },
      review: {
        query: 'AND a.status = ?',
        values: ['Review']
      },
      approved: {
        query: 'AND a.status = ?',
        values: ['Approved']
      },
      disapproved: {
        query: 'AND a.status = ?',
        values: ['Disapproved']
      }
    };
    // Determine filter condition from provided filter parameter
    let filterCondition = filterOptions[filter] || filterOptions['all'];
    let filterQuery = filterCondition.query;
    let filterValues = filterCondition.values;

    // Execute countQuery to get the total number of records
    const [countResult] = await db.query(`
      SELECT COUNT(*) AS totalRecords
      FROM recipes a
      WHERE 1=1 ${filterQuery};
    `, filterValues);
    
    const totalRecords = countResult[0].totalRecords;

    // Get the audio list with filter, sort, and pagination
    const [recipeList] = await db.query(`
      SELECT 
        a.*,
        u1.username AS creatorUsername,
        u2.username AS editorUsername
      FROM recipes a
      LEFT JOIN users u1 ON a.creatorID = u1.userID
      LEFT JOIN users u2 ON a.editorID = u2.userID
      WHERE 1=1 ${filterQuery}
      ORDER BY ${sortColumn} ${order}
      LIMIT ? OFFSET ?;
    `, [...filterValues, recordsPerPage, offset]);

    // Respond with the fetched data
    res.status(200).json({
      totalRecords,
      recipeList,
    });
  } catch (error) {
    logger.error(`recipeRoutes:/list: Error listing recipes: ${error}`);
    res.status(500).send('Server error during recipe list retrieval');
  }
});

//
// RECIPE CREATION, UPDATING, AND DELETION
//
//

// Route to create a new recipe
//
router.post('/create', verifyToken, async (req, res) => {
  try {
    const record = req.body;
    const decoded = jwt.verify(req.cookies.token, jwtSecretKey);
    const creatorID = decoded.userID;

    const query = `INSERT INTO recipes (title, description, creatorID, recipeData, status, classification, tags, comments) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [
      record.title,
      record.description,
      creatorID,
      // JSONstringify(record.recipeData),
      record.recipeData,
      record.status,
      JSON.stringify(record.classification),
      JSON.stringify(normalizeTagArray(record.tags)),
      record.comments
    ];
    const [result] = await db.query(query, values);
    const recipeID = result.insertId;
    res.status(200).json({
      message: 'Recipe created successfully',
      recipeID: recipeID
    });
  } catch (error) {
    logger.error(`recipeRoutes:/create: Error creating new recipe: ${error}`);
    res.status(500).send('Server error during recipe creation');
  }
});

// Route to update recipe information
//
router.post('/update', verifyToken, async (req, res) => {
  const record = req.body;
  logger.debug(`recipeRoutes:/update: record: ${JSONstringify(record)}`);
  const decoded = jwt.verify(req.cookies.token, jwtSecretKey);
  const editorID = decoded.userID;

  if (!record.recipeID) {
    return res.status(400).send('Recipe ID is required for update.');
  }
  try {
    const query = `UPDATE recipes SET
      title = ?,
      description = ?,
      editorID = ?,
      editDate = NOW(),
      recipeData = ?,
      status = ?,
      classification = ?,
      tags = ?,
      comments = ?
    WHERE recipeID = ?`;
    const values = [
      record.title,
      record.description,
      editorID,
      // JSONstringify(record.recipeData),
      record.recipeData,
      record.status,
      JSON.stringify(record.classification),
      JSON.stringify(normalizeTagArray(record.tags)),
      record.comments,
      record.recipeID
    ];

    const [result] = await db.query(query, values);
    if (result.affectedRows === 0) {
      return res.status(404).send('Recipe not found or no update was made');
    }
    res.status(200).json({ message: 'Recipe updated successfully' });
  } catch (error) {
    logger.error(`recipeRoutes:/update: Server error during recipe update: ${error}`);
    res.status(500).send('Server error');
  }
});

// Route to trash a recipe
//
router.post('/trash', verifyToken, async (req, res) => {
  const { recipeID } = req.body;
  if (!recipeID) {
    return res.status(400).send('Recipe ID is required');
  }
  try {
    const query = `UPDATE recipes SET status = 'Trashed' WHERE recipeID = ?`;
    const values = [recipeID];
    const [result] = await db.query(query, values);
    if (result.affectedRows === 0) {
      return res.status(404).send('Recipe not found');
    }
    res.status(200).json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    logger.error(`recipeRoutes:/trash: Error trashing recipe: ${error}`);
    res.status(500).send('Server error during recipe trashing');
  }
});

//
// HELPERS
//

// Normalizes a string of tags
const normalizeTagArray = (tagsArray) => {
  if (!tagsArray) return [];
  // Split the string into an array by commas, then process each tag
  return tagsArray.map(tag =>
      // Convert to lowercase, trim whitespace, and then replace special characters and spaces with dashes
      // Finally, trim any leading or trailing dashes that might have been added
      tag.toLowerCase().trim().replace(/[\W_]+/g, '-').replace(/^-+|-+$/g, '')
    )
    // Remove duplicate tags
    .filter((value, index, self) => self.indexOf(value) === index)
};

const repairBrokenJSON = (jsonField) => {
  if (typeof jsonField === 'string') {
    return [];
  }
  return jsonField;
};

module.exports = router;
