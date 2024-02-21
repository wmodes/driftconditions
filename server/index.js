// Initialize express and middleware to facilitate API routing and cross-origin resource sharing.
const express = require('express');
const app = express();
const cors = require('cors');
var mysql = require('mysql2');
const bcrypt = require('bcrypt'); 
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(cors()) ;

// Setup a connection pool to the MySQL database for efficient handling of multiple database connections.
const db  = mysql.createPool({
  connectionLimit : 10,
  host            : 'localhost',
  user            : 'root',
  password        : 'my$ql',
  database        : 'interference'
});

// Defines the number of hashing rounds for bcrypt, balancing security and performance.
const saltRounds = 10;

// app.get('/', (req, res) => {
//   db.query('INSERT INTO roles (role_name, permisssions) VALUES ("user", "[]")', (err, result) => {  
//     if (err) {
//       console.log(err)
//     } else {
//       console.log(result);
//     }
//   })
// })

// Route for handling user registration. It extracts user information from the request,
// hashes the password for secure storage, and inserts the new user into the database.
// Uses bcrypt for password hashing to securely store user credentials.
app.post('/signup', (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  const firstname = req.body.firstname;
  const lastname = req.body.lastname;
  const email = req.body.email;
  // Extracting and hashing user password, then storing user details in the database.
  // Responds with user info on success or error message on failure.
  bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
    if (err) {
      res.status(418).send(`Couldn't hash the password`); 
    } else {
      db.query('INSERT INTO users (username, password, firstname, lastname, email) VALUES (?, ?, ?, ?, ?)', [username, hashedPassword, firstname, lastname, email], (err, result) => {  
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
  const ussername = req.body.username;
  const password = req.body.password;
  // Authenticating user by comparing hashed password, showcasing secure login mechanism.
  db.query("SELECT * FROM users WHERE username = ?", [ussername], (err, result) => {
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
          const token = jwt.sign({ userID: result[0].user_id }, 'yourSecretKey', { expiresIn: '6h' });
          // Send the token to the client as part of the response.
          res.json({ 
            token, 
            username: result[0].username, 
            firstname: result[0].firstname, 
            lastname: result[0].lastname, 
            email: result[0].email });
        } else {  
          // If the passwords do not match, respond with an error.
          res.status(418).send(`Username or password doesn't match any records`);
        }
      })
    }
  })
})

// Starts the server, highlighting the use of a specific port for listening to incoming requests.
app.listen(8080, () => {
  console.log('server listening on port 8080');
  console.log('No need to connect to this server, the client will do that for you.');
})