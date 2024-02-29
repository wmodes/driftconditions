require('dotenv').config();
const dbPassword = process.env.DATABASE_PASSWORD;
const jwtSecretKey = process.env.JWT_SECRET_KEY;
// Initialize express which is a web framework that handles routing and middleware.  
const express = require('express');
const app = express();
// Init cors to allow requests from the client to the server
const cors = require('cors');
// Import the mysql2 module to connect to the MySQL database.
var mysql = require('mysql2');
// Import the bcrypt module to hash and compare passwords for secure user authentication.
const bcrypt = require('bcrypt'); 
// Import the body-parser module to parse incoming request bodies.
const bodyParser = require('body-parser');
// Import the jsonwebtoken module to generate and verify JWT tokens for user authentication.
const jwt = require('jsonwebtoken');
// Import the cookie-parser module to parse cookies from the request headers. 
const cookieParser = require('cookie-parser');
// Import multer module used to handle file uploads.
const multer = require('multer');
// Import path modules to handle file paths.
const path = require('path');
// Import fs module to handle file system operations.
const fs = require('fs');
// Import ffmpeg module to handle audio file conversion.
const ffmpeg = require('fluent-ffmpeg');
// Import ffprobePath from ffprobe-static to get the path to the ffprobe binary.
const ffprobePath = require('ffprobe-static').path;

// Import the verifyToken middleware
const verifyToken = require('./middleware/authMiddleware');

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(cors({
  origin: 'http://localhost:3000', // or your client's origin
  credentials: true, // to accept cookies via cross-origin requests
}));
// Use cookie-parser middleware to parse cookies
app.use(cookieParser()); 

// app.use((req, res, next) => {
//   console.log('Raw Cookies Header:', req.headers['cookie']);
//   next();
// });

// Place the logging middleware after cookie-parser to ensure cookies are parsed
app.use((req, res, next) => {
  // console.log('Cookies: ', req.cookies);
  next();
});

// Setup a connection pool to the MySQL database for efficient handling of multiple database connections.
const db  = mysql.createPool({
  connectionLimit : 10,
  host            : 'localhost',
  user            : 'root',
  password        : dbPassword,
  database        : 'interference'
});

// Defines the number of hashing rounds for bcrypt, balancing security and performance.
const saltRounds = 10;

// example of a protected route
// app.get('/', verifyToken, (req, res) => {
//   db.query('INSERT INTO roles (role_name, permisssions) VALUES ("user", "[]")', (err, result) => {  
//     if (err) {
//       console.log(err)
//     } else {
//       console.log(result);
//     }
//   })
// })


//
// USER REGISTRATION & AUTHENTICATION
//

// Route for handling user registration. It extracts user information from the request,
// hashes the password for secure storage, and inserts the new user into the database.
// Uses bcrypt for password hashing to securely store user credentials.
app.post('/signup', (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  const firstname = req.body.firstname;
  const lastname = req.body.lastname;
  const email = req.body.email;
  //TODO: Abstract the hashing and storing of user details into a separate function
  // Extracting and hashing user password, then storing user details in the database.
  // Responds with user info on success or error message on failure.
  bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
    if (err) {
      res.status(418).send(`Couldn't hash the password`); 
    } else {
      // Construct db query to insert user into the database
      const query = 'INSERT INTO users (username, password, firstname, lastname, email) VALUES (?, ?, ?, ?, ?)';
      const values = [username, hashedPassword, firstname, lastname, email];
      db.query(query, values, (err, result) => {  
        if (err) {
          res.status(418).send(`Couldn't register user`); 
        } else {  
          res.send({
            username: username,
            firstname: firstname,
            lastname: lastname,
            email: email
          });
        }
      })
    }
  })
})

// Route for user authentication. It retrieves the user from the database by username,
// compares the submitted password with the stored hashed password, and
// responds with user info on successful authentication or an error message on failure.
// This showcases using bcrypt to compare hashed passwords for login verification.
app.post('/signin', (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  // Construct db query
  const query = 'SELECT * FROM users WHERE username = ?';
  const values = [username];
  // Authenticating user by comparing hashed password, showcasing secure login mechanism.
  db.query(query, values, (err, result) => {
    if (err) {
      res.status(500).send(err.message);
    } else if (result.length < 1) {
      res.status(418).send(`Username or password doesn't match any records`);  
    } else {
      bcrypt.compare(password, result[0].password, (err, isMatch) => {
        if (err) {
          res.status(500).send(err.message);
        } else if (isMatch) {
          // If the passwords match, generate a JWT token for the user.
          const token = jwt.sign({ userID: result[0].user_id }, jwtSecretKey, { expiresIn: '6h' });
          res.cookie('token', token, { 
            httpOnly: true, 
            expires: new Date(Date.now() + 6 * 3600000),
            path: '/',
            sameSite: 'Lax', // or 'Strict' based on your requirements
            // secure: true, // Uncomment if your site is served over HTTPS
          }); // 6h expiration
          res.status(200).send({message: "Authentication successful"});
        } else {  
          // If the passwords do not match, respond with an error.
          res.status(418).send(`Username or password doesn't match any records`);
        }
      })
    }
  })
})

// Route for user logout. It expires the token cookie to invalidate the user session.
app.post('/logout', (req, res) => {
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

// Route for checking if the user is authenticated. It checks for the presence of the token cookie.
app.post('/api/auth/check', (req, res) => {
  if (req.cookies.token) {
    res.status(200).json({ isAuthenticated: true });
  } else {
    res.status(200).json({ isAuthenticated: false });
  }
});

//
// USER PROFILES & MODIFYING USER INFORMATION
//

// Route for showing a user's public profile. 
// If a targetID is provided, it shows that ID, 
// otherwise it extracts the user ID from the token, and returns the user's information.
// This is a protected route, only accessible to authenticated users.
app.post('/profile', verifyToken, async (req, res) => {
  const fields = ['username', 'firstname', 'lastname', 'email', 'url', 'bio', 'location', 'role_name', 'added_on'];

  try {
    const token = req.cookies.token;
    const decoded = jwt.verify(token, jwtSecretKey);
    const userIDFromToken = decoded.userID;

    // Determine the targetID: Use provided targetID from the body or fallback to userID from the token
    const targetID = req.body.targetID || userIDFromToken;

    // Fetch the target user's information based on targetID or the userID from the token if targetID is not provided
    const userInfo = await getUserInfo({ userID: targetID });

    // Filter userInfo to include only the specified fields
    const filteredUserInfo = Object.keys(userInfo).reduce((acc, key) => {
      if (fields.includes(key)) {
        acc[key] = userInfo[key];
      }
      return acc;
    }, {});

    // Determine if the edit flag should be true or false
    const isEditable = targetID == userIDFromToken;

    // Respond with the user's information and the edit flag
    res.status(200).json({
      success: true,
      data: { ...filteredUserInfo, edit: isEditable }
    });
  } catch (error) {
    console.error('Error in profile route:', error);
    res.status(500).send("Server error");
  }
});

// Route to update user profile information in the database.
// It extracts the user information from the request and updates the user's information.
// This is a protected route, only accessible to authenticated users.
// TODO: Deal with password updates
app.post('/profile/update', verifyToken, (req, res) => {
  console.log('update profile');
  const { firstname, lastname, email, bio, location, url } = req.body;
  console.log('Request to update profile:', { firstname, lastname, email, bio, location, url });
  try {
    // Verify the token to get user ID
    const decoded = jwt.verify(req.cookies.token, jwtSecretKey);
    const userID = decoded.userID;

    // SQL query to update user information
    const query = `
      UPDATE users 
      SET firstname = ?, lastname = ?, email = ?, bio = ?, location = ?, url = ?
      WHERE user_id = ?
    `;
    const values = [firstname, lastname, email, bio, location, url, userID];

    // Execute the query
    db.query(query, values, (err, result) => {
      if (err) {
        console.error('Error updating user profile:', err);
        res.status(500).send('Error updating user profile');
      } else {
        res.status(200).send({ message: 'Profile updated successfully' });
      }
    });
  } catch (error) {
    console.error('Error in /profile/edit route:', error);
    res.status(500).send('Server error');
  }
});

// Function to get user information by userID or username from the database
async function getUserInfo({ userID = null, username = null } = {}) {
  return new Promise((resolve, reject) => {
    let query = '';
    let values = [];
    if (userID) {
      query = `SELECT * FROM users WHERE user_id = ?`;
      values = [userID];
    } else if (username) {
      query = `SELECT * FROM users WHERE username = ?`;
      values = [username];
    } else {
      return reject(new Error("Invalid query parameters: either userID or username must be provided"));
    }
    db.query(query, values, (err, result) => {
      if (err) {
        // console.error("Error fetching user info:", err);
        return reject(err);
      } else if (result.length < 1) {
        // console.log("No user found, returning null.");
        return resolve(null); // No user found
      } else {
        // console.log("Returning user info:", result[0]);
        return resolve(result[0]); // Assuming the query returns a single user
      }
    });
  });
}

// Function to get permissions for a role from the database
// Adjusted hasPermission function with added console.log statements
async function hasPermission(requestingUserInfo, callingRoute) {
  return new Promise((resolve, reject) => {
    // console.log('Checking permissions for:', requestingUserInfo.role_name, 'on route:', callingRoute);
    // Early exit if requestingUserInfo is not provided or invalid
    if (!requestingUserInfo || !requestingUserInfo.role_name) {
      // console.error('Invalid or missing requesting user info.');
      return reject(new Error('Invalid or missing requesting user info.'));
    }
    // Prep db params
    const query = 'SELECT permissions FROM roles WHERE role_name = ?';
    const values = [requestingUserInfo.role_name];
    // run db query
    db.query(query, values, (err, results) => {
      if (err) {
        // console.error('Error checking permissions:', err);
        return reject(err); // In case of error, default to denying permission
      }
      // console.log('Permissions query result:', results);
      if (results.length > 0 && results[0].permissions) {
        // Parse the permissions JSON to an array
        const permissionsArray = results[0].permissions;
        // console.log('Parsed permissions:', permissionsArray);
        // Check if the callingRoute is in the user's permissions
        const isPermitted = permissionsArray.includes(callingRoute);
        // console.log('Permission for route:', callingRoute, 'is', isPermitted ? 'granted' : 'denied');
        // console.log('Returning permission:', isPermitted)
        return resolve(isPermitted);
      } else {
        // If no permissions found or callingRoute is not permitted, return false
        // console.log('No permissions found or callingRoute not permitted for role:', requestingUserInfo.role_name);
        return resolve(false);
      }
    });
  });
}

// Route for showing another user's profile. It extracts the user ID from the token, and returns the target user's information.
// This is a protected route, only accessible to authenticated users.
app.post('/userlookup', verifyToken, async (req, res) => {
  fields = ['username', 'firstname', 'lastname', 'email', 'url', 'bio', 'location', 'role_name', 'validated', 'added_on'];
  try {
    const { username } = req.body; // Extracting username from the request body
    // console.log('Request for userlookup received', { username });
    if (!username) {
      // console.log('Bad request: Missing username');
      return res.status(400).send("Bad request: Missing username");
    }
    // Extract userID of the requesting user from the token
    const token = req.cookies.token;
    const decoded = jwt.verify(token, jwtSecretKey);
    const requestingUserID = decoded.userID;
    // console.log('Decoded JWT for user ID', { requestingUserID });
    // Fetch requesting user's information for permission check
    const requestingUserInfo = await getUserInfo({ userID: requestingUserID });
    // console.log('Requesting user info:', requestingUserInfo);
    // Check if the requesting user has permission to view the target user's information
    if (!await hasPermission(requestingUserInfo, 'userlookup')) { // Make sure to await the result
      // console.log('Permission denied for userlookup', { requestingUserID });
      return res.status(403).send("Forbidden: You do not have permission to view this user's information");
    }
    // Fetch and return the target user's information based on username
    const targetUserInfo = await getUserInfo({ username: username });
    // remove all but the fields we want to return  
    for (const field in targetUserInfo) {
      if (!fields.includes(field)) {
        delete targetUserInfo[field];
      }
    }
    // console.log('Target user info:', targetUserInfo);
    if (targetUserInfo) {
      res.status(200).json({
        success: true,
        data: targetUserInfo
      });
    } else {
      // console.log('User not found', { username });
      res.status(404).send("User not found");
    }
  } catch (error) {
    // console.error('Error in userlookup route:', error);
    res.status(500).send("Server error");
  }
});

//
// AUDIO UPLOAD & MANAGEMENT
//

// Multer configuration for temporary upload
const upload = multer({ dest: '../uploads/tmp' });

// Route to upload audio file
app.post('/api/audio/upload', verifyToken, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  try {
    // Verify token and get userID (sync)
    const decoded = jwt.verify(req.cookies.token, jwtSecretKey);
    const uploader_id = decoded.userID;
    console.log('Uploader ID:', uploader_id);
    // Rename file and move into place (async)
    const fullFilePath = await renameAndStore(req.file.path, req.body.title);
    console.log('New path:', fullFilePath);
    // Get audio duration (async)
    const duration = await getAudioDuration(newPath);
    console.log('Duration:', duration);
    // Get file type from file name in lowercase (sync)
    const file_type = path.extname(req.file.originalname).toLowerCase().substring(1);
    console.log('File type:', file_type);
    // Normalize and deduplicate tags (sync)
    const tags = normalizeTags(req.body.tags);
    // Prep db params
    const query = `INSERT INTO audio (title, filename, uploader_id, duration, file_type, classification, tags, comments, copyright_cert) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [
      req.body.title, // From request body
      fullFilePath,       // Calculated in route
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
//   - the upload dir is "../upload" at the root of the project
//   - final dir will be upload/year/monthnum/filename, and these dirs may have to be created
//   - filename will be the title in lowercase, punctuation removed, and spaces replaced with dashes
//   - extensions will be preserved but changed to lowercase. ex: eavesdropping-in-a-cafe.mp3
//   - the filename returned will be the full filepath minus the "../upload" root
async function renameAndStore(tempPath, title) {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  
  // Convert title to filename
  const filename = title.toLowerCase().replace(/[\W_]+/g, '-').replace(/^\-+|\-+$/g, '') + path.extname(tempPath).toLowerCase();
  
  // Construct new path
  const uploadDir = path.join(__dirname, '../upload', year, month);
  await mkdirp(uploadDir);
  
  const newPath = path.join(uploadDir, filename);
  
  // Move file from temp location to new path
  await fs.rename(tempPath, newPath);
  
  // Return the path relative to the "../upload" root
  return newPath.substring(newPath.indexOf('/upload/') + '/upload/'.length);
}

// Set ffprobe path for fluent-ffmpeg
ffmpeg.setFfprobePath(ffprobePath);

const getAudioDuration = (filePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        resolve(metadata.format.duration);
      }
    });
  });
};

// for tags, we will go through them (separated by commas) and normalized by converting to lowercase, removing special characters, trimming leading and trailing whitespace, and converting spaces to dashes. Also ensure that there are no duplicate tags.
const normalizeTags = (tagsString) => {
  // Split the string into an array by commas, then process each tag
  const tagsArray = tagsString.split(',')
    .map(tag => 
      // Convert to lowercase, trim whitespace, replace special characters and spaces with dashes
      tag.toLowerCase().trim().replace(/[\W_]+/g, '-')
    )
    // Remove duplicate tags
    .filter((value, index, self) => self.indexOf(value) === index);

  // Return the processed tags as a JSON string to be compatible with database storage
  return JSON.stringify(tagsArray);
};


// Starts the server, highlighting the use of a specific port for listening to incoming requests.
app.listen(8080, () => {
  console.log('server listening on port 8080');
  console.log('No need to connect to this server, the client will do that for you.');
})