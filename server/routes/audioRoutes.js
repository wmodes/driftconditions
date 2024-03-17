// audioRoutes.js - This file contains the routes for audio file upload and management.
// List of routes:
//   /api/audio/upload - Route to upload audio file
//   /api/audio/info - Route to fetch audio info
//   /api/audio/list - Route to list audio files
//   /api/audio/update - Route to update audio information
//   /api/audio/trash - Route to trash an audio file

// foundational imports
const express = require('express');
const router = express.Router();
const db = require('../database');

// authentication imports
const jwt = require('jsonwebtoken');
const verifyToken = require('../middleware/authMiddleware');

// audio and file management imports
const multer = require('multer');
const { getAudioDurationInSeconds } = require('get-audio-duration');
const fs = require('fs').promises;
const fsExtra = require('fs-extra');
const path = require('path');
const { mkdirp } = require('mkdirp');

// configuration import
const config = require('../config');

// pull these out of the config object
const jwtSecretKey = config.authToken.jwtSecretKey;
const uploadFileDir = config.upload.uploadFileDir;
const tmpFileDir = config.upload.tmpFileDir;

//
// AUDIO FETCHING AND LISTING
//
//

// Route to list audio files
router.post('/list', verifyToken, async (req, res) => {
  try {

    // Construct sort and filter parameters
    const sort = req.body.sort || 'date';
    const order = req.body.order === 'ASC' ? 'ASC' : 'DESC';
    const filter = req.body.filter;
    const targetID = req.body.targetID || req.user.userID;
    const page = req.body.page || 1;
    const recordsPerPage = req.body.recordsPerPage || 15;
    const offset = (page - 1) * recordsPerPage;

    // Determine sort column from provided sort parameter
    const sortOptions = {
      id: 'audio_id',
      title: 'LOWER(title)',
      status: 'LOWER(status)',
      author: 'creator_id', 
      date: 'create_date',
    };
    const sortColumn = sortOptions[sort] || 'create_date';

    // Define filter options
    const filterOptions = {
      all : {
        query: 'AND a.status != ?', 
        values: ['Trashed']
      },
      user: {
        query: 'AND a.creator_id = ? AND a.status != ?',
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
      FROM audio a
      WHERE 1=1 ${filterQuery};
    `, filterValues);
    
    const totalRecords = countResult[0].totalRecords;

    // Get the audio list with filter, sort, and pagination
    const [audioList] = await db.query(`
      SELECT 
        a.*,
        u1.username AS creator_username,
        u2.username AS editor_username
      FROM audio a
      LEFT JOIN users u1 ON a.creator_id = u1.user_id
      LEFT JOIN users u2 ON a.editor_id = u2.user_id
      WHERE 1=1 ${filterQuery}
      ORDER BY ${sortColumn} ${order}
      LIMIT ? OFFSET ?;
    `, [...filterValues, recordsPerPage, offset]);

    // Respond with the fetched data
    res.status(200).json({
      totalRecords,
      audioList,
    });
  } catch (error) {
    console.error('Error listing audio files:', error);
    res.status(500).send('Server error during audio list retrieval');
  }
});

// Route to fetch audio info
router.post('/info', verifyToken, async (req, res) => {
  const { audioID } = req.body;
  if (!audioID) {
    return res.status(400).send('Audio ID is required');
  }
  try {
    // Verify token and get userID (optional for this route, depending on your security model)
    const decoded = jwt.verify(req.cookies.token, jwtSecretKey);
    // You might not need the userID here unless you're checking if the user has the right to view this audio's info

    // Construct query to fetch audio info from the database
    const query = `SELECT * FROM audio WHERE audio_id = ?`;
    const values = [audioID];

    const [result] = await db.query(query, values);
    if (result.length === 0) {
      return res.status(404).send('Audio not found');
    }
    res.status(200).json(result[0]);
  } catch (error) {
    console.error('Error verifying token or fetching audio info:', error);
    res.status(500).send('Server error during audio info retrieval');
  }
});

//
// UPLOADING AUDIO
//
//

// Multer configuration for temporary upload
const upload = multer({ dest: tmpFileDir });

// Route to upload audio file
router.post('/upload', verifyToken, upload.single('file'), async (req, res) => {
  // console.log(req.body);
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  try {
    // console.log("orig file name: ", req.file.originalname)
    // Verify token and get userID (sync)
    const decoded = jwt.verify(req.cookies.token, jwtSecretKey);
    const creator_id = decoded.userID;
    // console.log('Uploader ID:', creator_id);
    // Rename file and move into place (async)
    const filePathForDB = await renameAndStore(req.file.path, req.file.originalname, req.body.title);
    const fullFilePath = path.join(uploadFileDir, filePathForDB);
    // console.log('relFilePath:', fullFilePath, 'file path for db:', filePathForDB);
    // Get audio duration (async)
    const duration = await getAudioDuration(fullFilePath);
    // console.log('Duration:', duration);
    // Get file type from file name in lowercase (sync)
    const file_type = path.extname(req.file.originalname).toLowerCase().substring(1);
    // console.log('File type:', file_type);

    // Prep db params
    const query = `INSERT INTO audio (title, filename, creator_id, duration, file_type, classification, tags, comments, copyright_cert) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [
      req.body.title, 
      filePathForDB, 
      creator_id, 
      duration, 
      file_type, 
      JSON.stringify(classification), 
      JSON.stringify(normalizeTagArray(tags)), 
      req.body.comments, 
      req.body.copyright_cert
    ];

    // Execute the query
    const [result] = await db.query(query, values);
    const audioID = result.insertId;
    res.status(200).send({
      message: 'File uploaded successfully',
      filepath: filePathForDB,
      audioID: audioID
    });
  } catch (error) {
    console.error('Error processing upload:', error);
    res.status(500).send('Server error during file processing');
  }
});

// Route to fetch audio file
router.get('/sample/:year/:month/:filename', verifyToken, async (req, res) => {
  // Extract parameters from the request
  const { year, month, filename } = req.params;

  // Construct the file path
  // Adjust the path according to your actual files location
  const filePath = path.join(uploadFileDir, year, month, filename);
  // console.log('File path:', filePath);

  try {
    // Use fs.promises.access to check if the file exists. 
    // Note: fs.promises.access does not directly return a value, but it will reject if the file does not exist
    await fs.access(filePath, fs.constants.F_OK);
    // console.log('File exists:', filePath);

    // If the file exists, send it
    res.sendFile(filePath, (err) => {
      if (err) {
        // console.error('Error sending file:', err);
        // Handle error, but don't expose internal details
        res.status(500).send('Error serving the file');
      }
    });
  } catch (err) {
    // console.error('File does not exist:', filePath);
    res.status(404).send('File not found');
  }
});

//
// UPDATING AUDIO
//
//

// Route to update audio information
router.post('/update', verifyToken, async (req, res) => {
  const { audioID, title, status, classification, tags, comments } = req.body;
  
  if (!audioID) {
    return res.status(400).send('Audio ID is required for update.');
  }
  
  try {
    const query = `UPDATE audio SET
        title = ?,
        status = ?,
        classification = ?,
        tags = ?,
        comments = ?
      WHERE audio_id = ?`;
    const values = [
      title, 
      status, 
      JSON.stringify(classification), 
      JSON.stringify(normalizeTagArray(tags)), 
      comments, 
      audioID
    ];

    // Execute the query
    const [result] = await db.query(query, values);
    if (result.affectedRows === 0) {
      // This means the audio ID was not found or no fields were changed.
      return res.status(404).send('Audio not found or no update was made');
    }
    res.status(200).send({ message: 'Audio updated successfully' });
  } catch (error) {
    console.error('Server error during audio update:', error);
    res.status(500).send('Server error');
  }
});

// Route to trash an audio file
router.post('/trash', verifyToken, async (req, res) => {
  const audioID = req.body.audioID;
  if (!audioID) {
    return res.status(400).send('Audio ID is required');
  }
  try {
    // Verify the token to get user ID
    const decoded = jwt.verify(req.cookies.token, jwtSecretKey);
    const userID = decoded.userID;
    // construct query and values
    const query = `UPDATE audio SET status = 'Trashed' WHERE audio_id = ?`;
    const values = [audioID];
    const [result] = await db.query(query, values);
    if (result.affectedRows === 0) {
      return res.status(404).send('Audio not found');
    }
    res.status(200).send({ message: 'Audio trashed successfully' });    
  } catch (error) {
    console.error('Error trashing audio file:', error);
    res.status(500).send('Server error during audio trashing');
  }
});

//
// HELPERS
//

// Renames the file and moves it to the final upload directory
async function renameAndStore(tempPath, origFilename, title) {

  // get date info for the directory structure
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');

  // create the directory if it doesn't exist
  const uploadDir = path.join(uploadFileDir, year, month);
  // console.log('Upload dir:', uploadDir);
  await mkdirp(uploadDir);

  // Normalize the title to be used as the filename
  let baseFilename = title.toLowerCase().replace(/[\W_]+/g, '-').replace(/^\-+|\-+$/g, '');
  // console.log('Base filename:', baseFilename);

  // Extract the extension from the original filename
  const extension = path.extname(origFilename).toLowerCase();
  // console.log('Original file extension:', extension);

  // Place the file in the final directory
  //
  // Initialize the counter and construct the initial fullFilepath
  // Base case: if the file doesn't alraedy exist, ex: 2024/03/eavesdropping.mp3
  let counter = 0;
  let filename = `${baseFilename}${extension}`;
  let fullFilepath = path.join(uploadDir, filename);

  // Loop until a unique filename is found without overwriting existing files
  // Collision-case: if file exists, append a number, ex: 2024/03/eavesdropping-14.mp3
  while (await fsExtra.pathExists(fullFilepath)) {
    counter++;
    filename = `${baseFilename}-${counter}${extension}`;
    fullFilepath = path.join(uploadDir, filename);
  }

  // Move the file to the final path without overwriting
  await fsExtra.move(tempPath, fullFilepath, { overwrite: false });
  // console.log('File moved to:', fullFilepath);
  
  // Calculate the relative path without hardcoding
  const relativePath = path.relative(path.join(uploadFileDir), fullFilepath);
  // console.log('Relative path:', relativePath);

  return relativePath;
}

// Get the duration of an audio file in seconds using the get-audio-duration module
const getAudioDuration = (filePath) => {
  return getAudioDurationInSeconds(filePath);
};

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

module.exports = router;