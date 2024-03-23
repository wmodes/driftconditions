// middleware/authMiddleware.js
// This middleware is responsible for verifying the JWT token in incoming requests.
// It ensures that the token is valid. It should not return the userID because we will use the token in the future to get the user's identity.

const config = require('../../../config/config');
// pull these out of the config object
const jwtSecretKey = config.authToken.jwtSecretKey;

const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  // Extract the token from the cookies sent by the client
  const token = req.cookies.token;

  if (token) {
    // Verify the token using the same secret key used to sign the tokens.
    jwt.verify(token, jwtSecretKey, (err, decoded) => {
      if (err) {
        // If token verification fails, send a 403 Forbidden response.
        return res.status(403).send("Unauthorized: Token verification failed");
      }

      // Optionally, attach decoded information to request for use in subsequent handlers
      req.user = decoded;

      next(); // Proceed to the next middleware/route handler.
    });
  } else {
    // If no token is provided in the cookies, send a 401 Unauthorized response.
    return res.status(401).send("Unauthorized: No token provided");
  }
};

module.exports = verifyToken;
