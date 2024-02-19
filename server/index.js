const express = require('express');
const app = express();
const cors = require('cors');
var mysql = require('mysql2');
const bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(cors()) ;

const db  = mysql.createPool({
  connectionLimit : 10,
  host            : 'localhost',
  user            : 'root',
  password        : 'my$ql',
  database        : 'interference'
});

// app.get('/', (req, res) => {
//   db.query('INSERT INTO roles (role_name, permisssions) VALUES ("user", "[]")', (err, result) => {  
//     if (err) {
//       console.log(err)
//     } else {
//       console.log(result);
//     }
//   })
// })

app.post('/signup', (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  const firstname = req.body.firstname;
  const lastname = req.body.lastname;
  const email = req.body.email;

  db.query('INSERT INTO users (username, password, firstname, lastname, email) VALUES (?, ?, ?, ?, ?)', [username, password, firstname, lastname, email], (err, result) => {  
    if (err) {
      console.log(err)
    } else {
      res.send({
        username: username,
        firstname: firstname,
        lastname: lastname,
        email: email
      });
    }
  })
})

app.listen(8080, () => {
  console.log('server listening on port 8080')
})