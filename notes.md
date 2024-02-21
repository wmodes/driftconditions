# Basic Node/React/MySQL App Notes

At this point we have a working Express server and React client talking to a MySQL database.

## Start Up

To start the server (assuming we are at the root of our project):

```
cd server
node index.js
```

To start the react client (first going back to the root of the project):

```
cd client
npm run start
```

Starting the mysql server:

```
/usr/local/opt/mysql/bin/mysqld_safe --datadir\=/usr/local/var/mysql
```

## Technologies

Here is a list of technologies we are relying on:

Server:

- Node
- Express
    - body-parser
    - bcrypt
- MySql

Client:

- React
    - Axios
    - react-router-dom
    - redux/toolkit
- Tailwind
