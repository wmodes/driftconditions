// middleware/authMiddleware.js
// This middleware is responsible for verifying the JWT token in incoming requests.
// It ensures that the token is valid and extracts the userID from it,
// attaching this information to the request object for use in subsequent route handlers.

require('dotenv').config();
const jwtSecretKey = process.env.JWT_SECRET_KEY;

const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  // Extract the token from the Authorization header.
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1]; // Assumes 'Bearer TOKEN' format.

    // Verify the token using the same secret key used to sign the tokens.
    jwt.verify(token, jwtSecretKey, (err, decoded) => {
      if (err) {
        // If token verification fails, send a 403 Forbidden response.
        return res.status(403).send("Unauthorized: Token verification failed");
      }

      // On successful verification, attach the decoded token (including userID) to the request object.
      req.user = decoded;
      next(); // Proceed to the next middleware/route handler.
    });
  } else {
    // If no token is provided, send a 401 Unauthorized response.
    return res.status(401).send("Unauthorized: No token provided");
  }
};

module.exports = verifyToken;
