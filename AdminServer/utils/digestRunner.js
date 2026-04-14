// digestRunner.js - Contributor digest builder and sender
//
// Queries userComms for unsent events, groups by user, and sends a personalized
// digest email. Each user gets one email per run regardless of how many events
// they have pending. After sending, all included rows are marked sentAt = NOW().
//
// Called by scripts/run-digest.js on a cron schedule.
// Can also be invoked manually for testing.

const { database: db } = require('config');
const { config } = require('config');
const brand = require('config/brand');
const { sendTemplate, FROM } = require('./mailer');
const logger = require('config/logger').custom('AdminServer', 'info');
const jwt = require('jsonwebtoken');

const jwtSecretKey = config.authToken.jwtSecretKey;
const siteUrl = brand.siteUrl;

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Format a date as "Month YYYY" (e.g. "February 2024")
function formatMonthYear(date) {
  if (!date) return null;
  return new Date(date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// Generate a signed unsubscribe URL for a given userID.
// Token never expires — unsubscribe should always work.
function makeUnsubscribeUrl(userID) {
  const token = jwt.sign({ userID, purpose: 'unsubscribe' }, jwtSecretKey);
  return `${siteUrl}/api/user/unsubscribe?token=${encodeURIComponent(token)}`;
}

// Fetch profile stats for one user (replicates the logic in userRoutes getProfileStats)
async function getProfileStats(userID) {
  const [[audioRow]] = await db.query(
    `SELECT COUNT(*) AS total,
            SUM(status = 'Review') AS pending,
            SUM(COALESCE(timesUsed, 0)) AS totalPlays,
            MAX(createDate) AS lastContributed
     FROM audio WHERE creatorID = ?`,
    [userID]
  );

  const [[recipeRow]] = await db.query(
    `SELECT COUNT(*) AS total,
            SUM(status = 'Review') AS pending
     FROM recipes WHERE creatorID = ?`,
    [userID]
  );

  const [topPlays] = await db.query(
    `SELECT audioID, title, timesUsed
     FROM audio WHERE creatorID = ? AND status = 'Approved'
     ORDER BY timesUsed DESC LIMIT 5`,
    [userID]
  );

  const [recentPendingRows] = await db.query(
    `SELECT audioID, title, createDate
     FROM audio WHERE creatorID = ? AND status = 'Review'
     ORDER BY createDate DESC LIMIT 24`,
    [userID]
  );

  return { audioRow, recipeRow, topPlays, recentPendingRows };
}

// ─── Main runner ─────────────────────────────────────────────────────────────

async function runDigest() {
  logger.info('digestRunner: starting digest run');

  // Find all users who have unsent userComms events and have not opted out
  const [usersWithEvents] = await db.query(
    `SELECT DISTINCT u.userID, u.firstname, u.username, u.email,
            u.addedOn, u.digestFrequency
     FROM userComms uc
     JOIN users u ON u.userID = uc.userID
     WHERE uc.sentAt IS NULL
       AND u.digestFrequency != 'nodigest'
       AND u.status = 'Active'`
  );

  logger.info(`digestRunner: ${usersWithEvents.length} user(s) with pending events`);

  for (const user of usersWithEvents) {
    try {
      await sendDigestToUser(user);
    } catch (err) {
      logger.error(`digestRunner: failed for user ${user.username}: ${err.message}`);
    }
  }

  logger.info('digestRunner: digest run complete');
}

async function sendDigestToUser(user) {
  const { userID, firstname, username, email, addedOn } = user;

  // Fetch pending events for this user
  const [events] = await db.query(
    `SELECT commID, commType, payload FROM userComms
     WHERE userID = ? AND sentAt IS NULL
     ORDER BY createdAt ASC`,
    [userID]
  );

  if (events.length === 0) return;

  // Split events into approved and disapproved lists
  const approved = [];
  const disapproved = [];
  const commIDs = [];

  for (const event of events) {
    commIDs.push(event.commID);
    const payload = typeof event.payload === 'string'
      ? JSON.parse(event.payload)
      : event.payload;

    if (event.commType === 'audio_approved') {
      approved.push({ audioID: payload.audioID, title: payload.title });
    } else if (event.commType === 'audio_disapproved') {
      disapproved.push({
        audioID: payload.audioID,
        title: payload.title,
        notes: payload.notes || '',
      });
    }
  }

  // Fetch profile stats
  const { audioRow, recipeRow, topPlays, recentPendingRows } = await getProfileStats(userID);

  const recentPending = recentPendingRows.map(r => ({
    audioID: r.audioID,
    title: r.title,
    date: formatMonthYear(r.createDate),
  }));

  // Build template variables
  const vars = {
    firstname: firstname || username,
    username,
    memberSince:      formatMonthYear(addedOn),
    lastContributed:  formatMonthYear(audioRow.lastContributed),
    totalPlays:       parseInt(audioRow.totalPlays, 10) || 0,
    audioContributed: audioRow.total || 0,
    audioPending:     audioRow.pending || 0,
    recipesContributed: recipeRow.total || 0,
    recipesPending:     recipeRow.pending || 0,
    hasRecipes:       (recipeRow.total || 0) > 0,
    topPlays,
    hasTopPlays:      topPlays.length > 0,
    recentPending,
    hasRecentPending: recentPending.length > 0,
    approved,
    hasApproved:      approved.length > 0,
    disapproved,
    hasDisapproved:   disapproved.length > 0,
    unsubscribeUrl:   makeUnsubscribeUrl(userID),
  };

  // Send the digest email
  await sendTemplate('contributor-digest', vars, { to: email, from: FROM.noreply });
  logger.info(`digestRunner: sent digest to ${username} (${approved.length} approved, ${disapproved.length} disapproved)`);

  // Mark all included events as sent
  if (commIDs.length > 0) {
    await db.query(
      `UPDATE userComms SET sentAt = NOW() WHERE commID IN (?)`,
      [commIDs]
    );
  }
}

module.exports = { runDigest };
