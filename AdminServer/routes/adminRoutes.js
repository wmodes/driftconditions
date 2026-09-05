// adminRoutes.js - routes for admin-level operations
// List of routes:
//   /api/admin/news/list   - Fetch unsent admin news items
//   /api/admin/news/create - Post a new admin news item

// foundational imports
const express = require('express');
const router = express.Router();
const logger = require('config/logger').custom('AdminServer', 'info');
const { database: db } = require('config');

// authentication imports
const verifyToken = require('../middleware/authMiddleware');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRequestingUserInfo(req) {
  // verifyToken (required on every route calling this) already decoded the
  // token -- from a cookie or an Authorization: Bearer header -- into
  // req.user. Re-verifying req.cookies.token directly here crashed the
  // whole process on any bearer-authenticated request (mobile), since
  // jwt.verify(undefined, ...) throws synchronously outside any try/catch.
  return req.user;
}

function hasPermission(userInfo, permission) {
  return userInfo?.permissions?.includes(permission);
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/news/list
 * Returns all unsent admin_news items, newest first.
 * Requires: adminNews permission
 */
router.post('/news/list', verifyToken, async (req, res) => {
  try {
    const requestingUserInfo = getRequestingUserInfo(req);
    if (!hasPermission(requestingUserInfo, 'adminNews')) {
      return res.status(403).json({ error: { message: 'Permission denied.' } });
    }

    const [rows] = await db.query(
      `SELECT commID, payload, createdAt
       FROM userComms
       WHERE commType = 'admin_news' AND sentAt IS NULL
       ORDER BY createdAt ASC`
    );

    const news = rows.map(r => {
      const payload = typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload;
      return { commID: r.commID, content: payload.content, createdAt: r.createdAt, username: payload.username };
    });

    res.status(200).json({ news });
  } catch (error) {
    logger.error(`adminRoutes:/news/list: ${error}`);
    res.status(500).json({ error: { message: 'Server error. Try again later.' } });
  }
});

/**
 * POST /api/admin/news/create
 * Inserts a new admin_news item into userComms.
 * Requires: adminNews permission
 */
router.post('/news/create', verifyToken, async (req, res) => {
  try {
    const requestingUserInfo = getRequestingUserInfo(req);
    if (!hasPermission(requestingUserInfo, 'adminNews')) {
      return res.status(403).json({ error: { message: 'Permission denied.' } });
    }

    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: { message: 'Content is required.' } });
    }

    await db.query(
      `INSERT INTO userComms (userID, commType, payload) VALUES (?, 'admin_news', ?)`,
      [requestingUserInfo.userID, JSON.stringify({ content: content.trim(), username: requestingUserInfo.username })]
    );

    logger.info(`adminRoutes:/news/create: posted by userID ${requestingUserInfo.userID}`);
    res.status(200).json({ message: 'News item posted.' });
  } catch (error) {
    logger.error(`adminRoutes:/news/create: ${error}`);
    res.status(500).json({ error: { message: 'Server error. Try again later.' } });
  }
});

module.exports = router;
