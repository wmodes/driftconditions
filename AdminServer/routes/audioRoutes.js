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
const logger = require('config/logger').custom('AdminServer', 'info');
const { database: db } = require('config');

// authentication imports
const jwt = require('jsonwebtoken');
const verifyToken = require('../middleware/authMiddleware');
const { sendTemplate, FROM } = require('../utils/mailer');
const { logAudit } = require('../utils/audit');

// audio and file management imports
const multer = require('multer');
const { getAudioDurationInSeconds } = require('get-audio-duration');
const fs = require('fs').promises;
const fsExtra = require('fs-extra');
const path = require('path');
const { mkdirp } = require('mkdirp');
const crypto = require('crypto');
const { spawn } = require('child_process');

// configuration import
const { config } = require('config');

// pull these out of the config object
const jwtSecretKey = config.authToken.jwtSecretKey;
const clipsDir = config.content.clipsDir;
const tmpFileDir = config.content.tmpFileDir;
const coverImageDir = config.content.coverImage.dir;
const coverImageSize = config.content.coverImage.size;
const musicAnalysisClassifications = config.audio.musicAnalysisClassifications;
const audioInternalTags = config.audio.internalTags;

// Multer configuration for temporary upload
const upload = multer({ dest: tmpFileDir });

// Multer configuration for cover image upload
const uploadCover = multer({ dest: tmpFileDir });


//
// AUDIO FETCHING AND LISTING
//
//

// Route to list audio files
//
router.post('/list', verifyToken, async (req, res) => {
  try {
    logger.debug(`audioRoutes:/list: req.body: ${JSON.stringify(req.body, null, 2)}`);

    // Construct sort and filter parameters
    const sort = req.body.sort || 'date';
    const order = req.body.order === 'ASC' ? 'ASC' : 'DESC';
    const filter = req.body.filter;
    const targetID = req.body.targetID || null;
    const page = req.body.page || 1;
    const recordsPerPage = req.body.recordsPerPage || 15;
    const offset = (page - 1) * recordsPerPage;

    // Determine sort column from provided sort parameter
    const sortOptions = {
      id: 'audioID',
      title: 'title',
      status: 'LOWER(a.status)',
      author: 'creatorID',
      date: 'createDate',
      plays: 'timesUsed',
      duration: 'duration',
    };
    const sortColumn = sortOptions[sort.toLowerCase()] || 'createDate';

    // Status filter — independent of user filter
    const filterOptions = {
      all:        { query: 'AND a.status != ?', values: ['Trashed'] },
      trash:      { query: 'AND a.status = ?',  values: ['Trashed'] },
      review:     { query: 'AND a.status = ?',  values: ['Review'] },
      approved:   { query: 'AND a.status = ?',  values: ['Approved'] },
      disapproved:{ query: 'AND a.status = ?',  values: ['Disapproved'] },
    };
    let filterCondition = filterOptions[filter] || filterOptions['all'];
    let filterQuery = filterCondition.query;
    let filterValues = filterCondition.values;

    // User filter — additive, stacks with status filter
    const userQuery = targetID ? 'AND a.creatorID = ?' : '';
    const userValues = targetID ? [targetID] : [];

    // Parse search string into tokens, respecting quoted phrases.
    // Each token is ANDed across title, tags, and comments.
    const searchRaw = req.body.search || '';
    const searchTokens = [];
    const tokenRegex = /"([^"]+)"|(\S+)/g;
    let tokenMatch;
    while ((tokenMatch = tokenRegex.exec(searchRaw)) !== null) {
      searchTokens.push(tokenMatch[1] || tokenMatch[2]);
    }
    // Build one AND clause per token: (title LIKE ? OR tags LIKE ? OR comments LIKE ?)
    const searchQuery = searchTokens
      .map(() => 'AND (a.title LIKE ? OR a.tags LIKE ? OR a.comments LIKE ?)')
      .join(' ');
    const searchValues = searchTokens.flatMap(t => [`%${t}%`, `%${t}%`, `%${t}%`]);

    // construct query and value strings
    const queryStr1 = `
      SELECT
        COUNT(*) AS totalRecords
      FROM audio a
      WHERE 1=1 ${filterQuery} ${userQuery} ${searchQuery};
    `;
    const queryValues1 = [...filterValues, ...userValues, ...searchValues];
    logger.debug(`audioRoutes:/list: queryStr1: ${queryStr1}, queryValues1: ${JSON.stringify(queryValues1)}`);

    // Execute countQuery to get the total number of records
    const [countResult] = await db.query(queryStr1, queryValues1);

    const totalRecords = countResult[0].totalRecords;

    // Get the audio list with filter, sort, and pagination
    // Construct the query string
    const queryStr2 = `
      SELECT
        a.*,
        u1.username AS creatorUsername,
        u2.username AS editorUsername
      FROM audio a
      LEFT JOIN users u1 ON a.creatorID = u1.userID
      LEFT JOIN users u2 ON a.editorID = u2.userID
      WHERE 1=1 ${filterQuery} ${userQuery} ${searchQuery}
      ORDER BY ${sortColumn} ${order}
      LIMIT ? OFFSET ?;
    `;
    const queryValues2 = [...filterValues, ...userValues, ...searchValues, recordsPerPage, offset];
    logger.debug(`audioRoutes:/list: queryStr2: ${queryStr2}, queryValues2: ${JSON.stringify(queryValues2)}`);

    // Execute the query
    const [audioList] = await db.query(queryStr2, queryValues2);

    // Respond with the fetched data
    res.status(200).json({
      totalRecords,
      audioList,
    });
  } catch (error) {
    logger.error(`audioRoutes:/list: Error listing audio files: ${error}`);
    res.status(500).json({ error: { message: 'Server error. Try again later.' } });
  }
});

// Route to fetch audio info
//
router.post('/info', verifyToken, async (req, res) => {
  const { audioID } = req.body;
  if (!audioID) {
    return res.status(400).json({ error: { message: 'Audio ID is required.' } });
  }
  try {
    // Verify token and get userID (optional for this route, depending on your security model)
    const decoded = jwt.verify(req.cookies.token, jwtSecretKey);
    // You might not need the userID here unless you're checking if the user has the right to view this audio's info

    // Construct query to fetch audio info from the database
    const query = `
    SELECT
      audio.*,
      creator.username AS creatorUsername,
      editor.username AS editorUsername
    FROM audio
    JOIN users AS creator ON audio.creatorID = creator.userID
    LEFT JOIN users AS editor ON audio.editorID = editor.userID
    WHERE audio.audioID = ?;`;
    const values = [audioID];

    const [result] = await db.query(query, values);
    if (result.length === 0) {
      return res.status(404).json({ error: { message: 'Audio not found.' } });
    }
    // Repair broken JSON fields
    record = result[0];
    record.classification = repairBrokenJSON(record.classification);
    record.tags = repairBrokenJSON(record.tags);
    record.internalTags = repairBrokenJSON(record.internalTags);
    res.status(200).json(record);
  } catch (error) {
    logger.error(`audioRoutes:/info: Error verifying token or fetching audio info: ${error}`);
    res.status(500).json({ error: { message: 'Server error. Try again later.' } });
  }
});

// Route to fetch audio file
//
router.get('/sample/:year/:month/:filename', verifyToken, async (req, res) => {
  // Extract parameters from the request
  const { year, month, filename } = req.params;

  // Construct the file path
  // Adjust the path according to your actual files location
  const filePath = path.join(clipsDir, year, month, filename);
  logger.debug(`audioRoutes:renameAndStore: filePath: ${filePath}`);

  try {
    await fs.access(filePath, fs.constants.F_OK);
    // File exists, proceed to send it
    res.sendFile(filePath, (err) => {
      if (err) {
        logger.error(`audioRoutes:/sample: Error sending file: ${err}`);
        if (!res.headersSent) {
          res.status(500).send('Error serving the file');
        } else {
          logger.error('audioRoutes:/sample: Response was already partially sent when error occurred');
        }
      }
    });
  } catch (err) {
    logger.error(`audioRoutes:/sample: File does not exist: ${filePath}`);
    if (!res.headersSent) {
      res.status(404).send('File not found');
    } else {
      logger.error('audioRoutes:/sample: Response was already partially sent when file not found error occurred');
    }
  }
});

//
// UPLOADING AUDIO
//

// Route to create an audio element including uploading the file
//
router.post('/upload', verifyToken, upload.single('file'), async (req, res) => {
  record = req.body;
  logger.debug(`audioUpload Route: record: ${JSON.stringify(record, null, 2)}`);
  if (!req.file) {
    return res.status(400).json({ error: { message: 'No file was received. Please select a file and try again.' } });
  }
  try {
    logger.debug(`audioRoutes:/upload: origfilename: ${req.file.originalname}`);
    // Verify token and get userID (sync)
    const decoded = jwt.verify(req.cookies.token, jwtSecretKey);
    const creatorID = decoded.userID;
    logger.debug(`audioRoutes:/upload: creatorID: ${creatorID}`);

    // Compute MD5 checksum from temp file before moving
    const fileBuffer = await fs.readFile(req.file.path);
    const checksum = crypto.createHash('md5').update(fileBuffer).digest('hex');
    logger.debug(`audioRoutes:/upload: checksum: ${checksum}`);

    // Check for exact duplicate by checksum
    const [checksumRows] = await db.query('SELECT audioID, title FROM audio WHERE checksum = ? LIMIT 1', [checksum]);
    if (checksumRows.length > 0) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(409).json({ error: { message: `This file has already been submitted (matches "${checksumRows[0].title}").` } });
    }

    // Rename file and move into place (async)
    const filePathForDB = await renameAndStore(req.file.path, req.file.originalname, record.title);
    const fullFilePath = path.join(clipsDir, filePathForDB);
    logger.debug(`audioRoutes:/upload: fullFilePath: ${fullFilePath}, filePathForDB: ${filePathForDB}`);
    // Get audio duration (async)
    const duration = await getAudioDuration(fullFilePath);
    logger.debug(`audioRoutes:/upload: duration: ${duration}`);
    // Get file type from file name in lowercase (sync)
    const filetype = path.extname(req.file.originalname).toLowerCase().substring(1);
    logger.debug(`audioRoutes:/upload: filetype: ${filetype}`);

    // Flag for music analysis if classification warrants it
    const classArr = coerceToArray(record.classification).map(c => c.toLowerCase());
    const needsAnalysis = classArr.some(c => musicAnalysisClassifications.map(m => m.toLowerCase()).includes(c));
    const initialInternalTags = needsAnalysis ? JSON.stringify([audioInternalTags.analysisQueue]) : null;

    // Prep db params
    const query = `INSERT INTO audio (title, status, filename, creatorID, duration, filetype, classification, tags, internalTags, comments, copyrightCert, checksum) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [
      record.title,
      record.status,
      filePathForDB,
      creatorID,
      duration,
      filetype,
      record.classification,
      JSON.stringify(normalizeTagArray(record.tags)),
      initialInternalTags,
      record.comments,
      record.copyrightCert,
      checksum
    ];

    // Execute the query
    const [result] = await db.query(query, values);
    const audioID = result.insertId;
    res.status(200).send({
      message: 'File uploaded successfully',
      filepath: filePathForDB,
      audioID: audioID,
    });
  } catch (error) {
    logger.error(`audioRoutes:/upload: Error processing upload: ${error}`);
    res.status(500).json({ error: { message: 'Server error. Try again later.' } });
  }
});

//
// UPDATING AUDIO
//

// Route to update audio information
//
router.post('/update', verifyToken, async (req, res) => {
  const record = req.body;
  logger.debug(`audioURoutes:/update record: ${JSON.stringify(record, null, 2)}`);
  const decoded = jwt.verify(req.cookies.token, jwtSecretKey);
  const editorID = decoded.userID;

  const { audioID, title, status, classification, tags, comments } = req.body;

  if (!record.audioID) {
    return res.status(400).json({ error: { message: 'Audio ID is required for update.' } });
  }

  try {
    // Fetch current state before update — needed for audit before/after diff
    const [currentRows] = await db.query(
      'SELECT title, status, classification, tags, comments, creatorID FROM audio WHERE audioID = ? LIMIT 1',
      [audioID]
    );
    const currentState = currentRows[0] || {};

    const query = `UPDATE audio SET
        title = ?,
        editorID = ?,
        editDate = NOW(),
        status = ?,
        classification = ?,
        tags = ?,
        internalTags = ?,
        comments = ?
      WHERE audioID = ?`;
    const values = [
      record.title,
      editorID,
      record.status,
      JSON.stringify(coerceToArray(record.classification)),
      JSON.stringify(normalizeTagArray(record.tags)),
      record.internalTags != null ? JSON.stringify(normalizeTagArray(record.internalTags)) : null,
      record.comments,
      record.audioID
    ];

    // Execute the query
    const [result] = await db.query(query, values);
    if (result.affectedRows === 0) {
      // This means the audio ID was not found or no fields were changed.
      return res.status(404).json({ error: { message: 'Audio not found or no update was made.' } });
    }
    res.status(200).send({ message: 'Audio updated successfully' });

    // Audit: status changes get their own action type; other edits grouped under audio_updated
    if (status && status !== currentState.status) {
      const actionType = status === 'Approved' ? 'audio_approved'
                       : status === 'Disapproved' ? 'audio_disapproved'
                       : 'audio_status_change';
      logAudit({
        tableName: 'audio', recordID: audioID, actionType,
        before: { status: currentState.status, comments: currentState.comments },
        after:  { status, comments: record.comments },
        meta:   { creatorID: currentState.creatorID, title: record.title },
        actionBy: editorID,
      });
    } else {
      // Non-status edit (title, classification, tags, comments)
      logAudit({
        tableName: 'audio', recordID: audioID, actionType: 'audio_updated',
        before: { title: currentState.title, classification: currentState.classification, tags: currentState.tags, comments: currentState.comments },
        after:  { title: record.title, classification: record.classification, tags: record.tags, comments: record.comments },
        meta:   { creatorID: currentState.creatorID },
        actionBy: editorID,
      });
    }

    // Post-response: queue digest event or send immediate moderation notice
    const notifyContributor = record.notifyContributor;
    const statusChanged = status && status !== currentState.status;
    const isApproved = statusChanged && status === 'Approved';
    const isDisapproved = statusChanged && status === 'Disapproved';
    const isModAction = isApproved || isDisapproved;

    if (notifyContributor && isModAction) {
      const [rows] = await db.query(
        `SELECT u.userID, u.firstname, u.username, u.email, u.digestFrequency, a.title
         FROM audio a JOIN users u ON u.userID = a.creatorID
         WHERE a.audioID = ? LIMIT 1`,
        [audioID]
      );
      if (rows.length > 0) {
        const { userID: creatorID, firstname, username, email, digestFrequency, title } = rows[0];

        if (digestFrequency === 'nodigest') {
          // Contributor wants individual emails — send immediately
          sendTemplate('audio-moderation', {
            firstname: firstname || username,
            username,
            clipTitle: title,
            action: isApproved ? 'approved' : 'rejected',
            approved: isApproved,
            notes: record.comments || '',
          }, { to: email, from: FROM.noreply }).catch((err) => {
            logger.error(`audioRoutes:/update: moderation email failed for ${username}: ${err.message}`);
          });
        } else {
          // Contributor uses digest — queue the event for batch delivery
          const commType = isApproved ? 'audio_approved' : 'audio_disapproved';
          db.query(
            `INSERT INTO userComms (userID, commType, payload) VALUES (?, ?, ?)`,
            [creatorID, commType, JSON.stringify({ audioID, title, notes: record.comments || '' })]
          ).catch((err) => logger.error(`audioRoutes:/update: userComms insert failed: ${err.message}`));
        }
      }
    }
  } catch (error) {
    logger.error(`audioRoutes:/update: Server error during audio update: ${error}`);
    res.status(500).json({ error: { message: 'Server error. Try again later.' } });
  }
});

// Route to trash an audio file
//
router.post('/trash', verifyToken, async (req, res) => {
  const audioID = req.body.audioID;
  if (!audioID) {
    return res.status(400).json({ error: { message: 'Audio ID is required.' } });
  }
  try {
    // Verify the token to get user ID
    const decoded = jwt.verify(req.cookies.token, jwtSecretKey);
    const userID = decoded.userID;

    // Fetch current state before trashing — full snapshot for audit (record will be gone)
    const [currentRows] = await db.query(
      'SELECT title, status, classification, tags, creatorID FROM audio WHERE audioID = ? LIMIT 1',
      [audioID]
    );
    const currentState = currentRows[0] || {};

    const query = `UPDATE audio SET status = 'Trashed' WHERE audioID = ?`;
    const values = [audioID];
    const [result] = await db.query(query, values);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: { message: 'Audio not found.' } });
    }
    res.status(200).send({ message: 'Audio trashed successfully' });
    logAudit({
      tableName: 'audio', recordID: audioID, actionType: 'audio_trashed',
      before: { title: currentState.title, status: currentState.status, classification: currentState.classification, tags: currentState.tags },
      meta:   { creatorID: currentState.creatorID },
      actionBy: userID,
    });
  } catch (error) {
    logger.error(`audioRoutes:/trash: Error trashing audio file: ${error}`);
    res.status(500).json({ error: { message: 'Server error. Try again later.' } });
  }
});

//
// COVER IMAGE UPLOAD
//

// POST /api/audio/cover/:audioID
// Accept a user-supplied cover image, resize to coverImageSize JPEG,
// save to coverImageDir/{audioID}.jpg, update DB.
router.post('/cover/:audioID', verifyToken, uploadCover.single('coverImage'), async (req, res) => {
  const { audioID } = req.params;
  if (!req.file) {
    return res.status(400).json({ error: { message: 'No image file provided.' } });
  }

  const tmpPath  = req.file.path;
  const outPath  = path.join(coverImageDir, `${audioID}.jpg`);
  const [w, h]   = coverImageSize;
  const vf       = `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}`;

  try {
    // Resize and convert to JPEG via ffmpeg
    await new Promise((resolve, reject) => {
      const proc = spawn('ffmpeg', ['-y', '-i', tmpPath, '-vf', vf, '-q:v', '2', outPath],
        { stdio: 'pipe' });
      proc.on('close', (code) => code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)));
    });

    // Fetch current internalTags, remove image-not-found, add image-from-user
    const [[row]] = await db.query('SELECT internalTags FROM audio WHERE audioID = ?', [audioID]);
    const tags = (row?.internalTags || [])
      .filter(t => t !== audioInternalTags.imageNotFound);
    if (!tags.includes(audioInternalTags.imageFromUser)) tags.push(audioInternalTags.imageFromUser);

    await db.query(
      'UPDATE audio SET coverImage = ?, internalTags = ? WHERE audioID = ?',
      [String(audioID), JSON.stringify(tags), audioID]
    );

    res.json({ coverImage: String(audioID) });
    logger.info(`audioRoutes:/cover: Cover image saved for audioID ${audioID}`);
  } catch (err) {
    logger.error(`audioRoutes:/cover: Error saving cover image: ${err.message}`);
    res.status(500).json({ error: { message: 'Failed to save cover image.' } });
  } finally {
    // Clean up temp file
    fs.unlink(tmpPath).catch(() => {});
  }
});

//
// HELPERS
//

// Renames the file and moves it to the final upload directory
// Normalize a title into a URL-safe filename slug
function slugifyTitle(title) {
  return title.toLowerCase().replace(/[\W_]+/g, '-').replace(/^\-+|\-+$/g, '');
}

async function renameAndStore(tempPath, origFilename, title) {

  // get date info for the directory structure
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');

  // create the directory if it doesn't exist
  const uploadDir = path.join(clipsDir, year, month);
  logger.debug(`audioRoutes:renameAndStore: uploadDir: ${uploadDir}`);
  await mkdirp(uploadDir);

  // Normalize the title to be used as the filename
  let baseFilename = slugifyTitle(title);
  logger.debug(`audioRoutes:renameAndStore: baseFilename: ${baseFilename}`);

  // Extract the extension from the original filename
  const extension = path.extname(origFilename).toLowerCase();
  logger.debug(`audioRoutes:renameAndStore: extension: ${extension}`);

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
  logger.debug(`audioRoutes:renameAndStore: fullFilepath: ${fullFilepath}`);
  
  // Calculate the relative path without hardcoding
  const relativePath = path.relative(path.join(clipsDir), fullFilepath);
  logger.debug(`audioRoutes:renameAndStore: relativePath: ${relativePath}`);

  return relativePath;
}

// Get the duration of an audio file in seconds using the get-audio-duration module
const getAudioDuration = (filePath) => {
  return getAudioDurationInSeconds(filePath);
};

// Coerces a value to an array — handles JSON array strings and comma-separated strings
const coerceToArray = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      return val.split(',');
    }
  }
  return [val];
};

// Normalizes a string or array of tags to lowercase-hyphenated deduplicated array
const normalizeTagArray = (tagsArray) => {
  return coerceToArray(tagsArray)
    .map(tag => tag.toLowerCase().trim().replace(/[\W_]+/g, '-').replace(/^-+|-+$/g, ''))
    .filter((value, index, self) => self.indexOf(value) === index);
};

const repairBrokenJSON = (jsonField) => {
  if (typeof jsonField === 'string') {
    return [];
  }
  return jsonField;
};

module.exports = router;