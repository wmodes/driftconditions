// middleware/authMiddleware.js
// This middleware is responsible for verifying the JWT token in incoming requests.
// It ensures that the token is valid. It should not return the userID because we will use the token in the future to get the user's identity.

const { config } = require('config');

// pull these out of the config object
const jwtSecretKey = config.authToken.jwtSecretKey;

const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  // Accept token from cookie (web) or Authorization: Bearer header (mobile)
  const authHeader = req.headers['authorization'];
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const token = req.cookies.token || bearerToken;

  if (token) {
    jwt.verify(token, jwtSecretKey, (err, decoded) => {
      if (err) {
        return res.status(403).send("Unauthorized: Token verification failed");
      }
      req.user = decoded;
      next();
    });
  } else {
    return res.status(401).send("Unauthorized: No token provided");
  }
};

module.exports = verifyToken;
