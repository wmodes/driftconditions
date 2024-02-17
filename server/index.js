const express = require('express');
const app = express();
const cors = require('cors');
var mysql = require('mysql');

app.use(cors()) 

const db  = mysql.createPool({
  connectionLimit : 10,
  host            : 'localhost',
  user            : 'root',
  password        : '1baddogE2Umy$ql',
  database        : 'interference'
});

app.get('/', (req, res) => {
  db.query('INSERT INTO roles (role_name, permisssions) VALUES ("user", "[]")', (err, result) => {  
    if (err) {
      console.log(err)
    } else {
      console.log(result)
    }
  })
})

app.listen(8080, () => {
  console.log('server listening on port 8080')
})