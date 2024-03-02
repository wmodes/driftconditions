// audioRoutes.js - This file contains the routes for audio file upload and management.
// List of routes:
//   /api/audio/upload - Route to upload audio file

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
// AUDIO UPLOAD & MANAGEMENT
//

// Multer configuration for temporary upload
const upload = multer({ dest: tmpFileDir });

// Route to upload audio file
router.post('/upload', verifyToken, upload.single('file'), async (req, res) => {
  console.log(req.body);
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  try {
    // console.log("orig file name: ", req.file.originalname)
    // Verify token and get userID (sync)
    const decoded = jwt.verify(req.cookies.token, jwtSecretKey);
    const uploader_id = decoded.userID;
    // console.log('Uploader ID:', uploader_id);
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
    // Normalize and deduplicate tags (sync)
    const tags = normalizeTags(req.body.tags);
    // Prep db params
    const query = `INSERT INTO audio (title, filename, uploader_id, duration, file_type, classification, tags, comments, copyright_cert) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [
      req.body.title, // From request body
      filePathForDB,       // Calculated in route
      uploader_id,    // Derived from token or request
      duration,       // Calculated from the file
      file_type,      // Determined from the file
      req.body.classification, // If calculated or from request
      JSON.stringify(tags), // Processed in route
      req.body.comments,    // From request body
      req.body.copyright_cert // From request body
    ];

    // Execute the query
    db.query(query, values, (err, result) => {
      if (err) {
        console.error('Error inserting audio file into database:', err);
        res.status(500).send('Error saving file info to database');
      } else {
        res.status(200).send({ message: 'File uploaded successfully', filepath: filePathForDB });
      }
    });

  } catch (error) {
    console.error('Error processing upload:', error);
    res.status(500).send('Server error during file processing');
  }
});

// Renames the file and moves it to the final upload directory
//   - the upload dir is "../uploads" at the root of the project
//   - final dir will be upload/year/monthnum/filename, and these dirs may have to be created
//   - filename will be the title in lowercase, punctuation removed, and spaces replaced with dashes
//   - extensions will be preserved but changed to lowercase. ex: eavesdropping-in-a-cafe.mp3
//   - check to see if file already exists, if so, add a number to the end of the filename
//   - move/rename file into the final directory
//   - the filename returned will be the full filepath minus the "../uploads" root
// @param tempPath - the temporary path where multer stored the file
// @param origFilename - the original filename of the file
// @param title - the title of the file
// @returns the relative path of the file in the "../uploads" directory
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

// Normalizes a string of tags:
// - Splits by commas into individual tags.
// - Converts to lowercase, trims whitespace.
// - Replaces special characters and spaces with dashes.
// - Removes duplicate tags.
// Returns processed tags as a JSON string for database storage.
const normalizeTags = (tagsString) => {
  // Split the string into an array by commas, then process each tag
  const tagsArray = tagsString.split(',')
    .map(tag =>
      // Convert to lowercase, trim whitespace, and then replace special characters and spaces with dashes
      // Finally, trim any leading or trailing dashes that might have been added
      tag.toLowerCase().trim().replace(/[\W_]+/g, '-').replace(/^-+|-+$/g, '')
    )
    // Remove duplicate tags
    .filter((value, index, self) => self.indexOf(value) === index);

  // Return the processed tags as an array
  return tagsArray;
};

module.exports = router;