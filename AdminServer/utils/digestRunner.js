/**
 * @file digestRunner.js
 * @description Daily digest runner for all user email types.
 *
 * Fires once daily via cron. Iterates a schedule table — each entry defines
 * a cadence, a recipient query, and a var builder. For each recipient the
 * runner checks two conditions:
 *
 *   1. isScheduledToday(user) — happy path; is today the right send day?
 *   2. missed — fallback; should this user have gotten this email recently
 *      but didn't? Catches missed sends when the server was down.
 *
 * After sending, event rows in userComms are marked sentAt = NOW(), and a
 * sentinel row (e.g. commType='digest_sent') is inserted so hasGottenLastDigest()
 * can gate against duplicate sends within the cadence window.
 *
 * Schedule:
 *   daily    — contributors/editors/mods/admins with submissions, digestFrequency='daily'
 *   weekly   — same, digestFrequency='weekly'; fires on config.digest.weeklyDay
 *   monthly  — same, digestFrequency='monthly'; fires on nth weeklyDay of the month
 *   reminder — contributors with NO submissions; fires on same monthly day
 *   yearly   — users (role='user'); fires on signup anniversary ± anniversaryWindowDays
 *              (TODO: user-reminder template not yet created; schedule entry commented out)
 *
 * Called by scripts/run-digest.js. Can also be invoked manually for testing.
 */

const { database: db } = require('config');
const { config } = require('config');
const brand = require('config/brand');
const { sendTemplate, FROM } = require('./mailer');
const logger = require('config/logger').custom('AdminServer', 'info');
const jwt = require('jsonwebtoken');

const jwtSecretKey = config.authToken.jwtSecretKey;
const siteUrl = brand.siteUrl;
const dc = config.digest; // digest config shorthand

// ─── Date helpers ─────────────────────────────────────────────────────────────

/**
 * Returns true if today is the configured weekly send day.
 * @returns {boolean}
 */
function isWeeklyDay() {
  return new Date().getDay() === dc.weeklyDay;
}

/**
 * Returns true if today is the nth occurrence of weeklyDay in the current month.
 * Both n and weeklyDay come from config.digest.
 * @returns {boolean}
 */
function isNthWeekdayOfMonth() {
  const today = new Date();
  if (today.getDay() !== dc.weeklyDay) return false;
  const occurrence = Math.ceil(today.getDate() / 7);
  return occurrence === dc.monthlyWeek;
}

// ─── Digest helpers ───────────────────────────────────────────────────────────

/**
 * Formats a date as "Month YYYY" (e.g. "February 2024").
 * @param {Date|string|null} date
 * @returns {string|null}
 */
function formatMonthYear(date) {
  if (!date) return null;
  return new Date(date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Generates a signed, non-expiring unsubscribe URL for the given user.
 * @param {number} userID
 * @returns {string}
 */
function makeUnsubscribeUrl(userID) {
  const token = jwt.sign({ userID, purpose: 'unsubscribe' }, jwtSecretKey);
  return `${siteUrl}/api/user/unsubscribe?token=${encodeURIComponent(token)}`;
}

/**
 * Returns the profile edit URL where a user can manage their digest preferences.
 * @param {string} username
 * @returns {string}
 */
function makeDigestPrefsUrl(username) {
  return `${siteUrl}/profile/edit/${username}`;
}

/**
 * Returns true if this user received a commType email within the last windowDays.
 * Used to gate re-sends and to catch missed sends when the server was down.
 * @param {number} userID
 * @param {string} commType - sentinel commType (e.g. 'digest_sent', 'reminder_sent')
 * @param {number} windowDays
 * @returns {Promise<boolean>}
 */
async function hasGottenLastDigest(userID, commType, windowDays) {
  const [[row]] = await db.query(
    `SELECT 1 FROM userComms
     WHERE userID = ? AND commType = ?
       AND createdAt > DATE_SUB(NOW(), INTERVAL ? DAY)
     LIMIT 1`,
    [userID, commType, windowDays]
  );
  return !!row;
}

/**
 * Inserts a sentinel row into userComms recording that a digest/reminder was sent.
 * hasGottenLastDigest() queries these rows to prevent duplicate sends.
 * @param {number} userID
 * @param {string} commType - e.g. 'digest_sent', 'reminder_sent'
 * @returns {Promise<void>}
 */
async function logSent(userID, commType) {
  await db.query(
    `INSERT INTO userComms (userID, commType, payload) VALUES (?, ?, '{}')`,
    [userID, commType]
  );
}

/**
 * Fetches contribution stats for one user: audio counts, recipe counts,
 * top played clips, and recently pending clips.
 * @param {number} userID
 * @returns {Promise<{audioRow, recipeRow, topPlays, recentPendingRows}>}
 */
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

// ─── Recipient queries ────────────────────────────────────────────────────────

/**
 * Returns all active users with at least one audio submission and the given
 * digestFrequency. Covers any role that can submit audio (contributor, editor,
 * mod, admin) — excludes role='user' who have not yet submitted.
 * @param {string} digestFrequency - e.g. 'daily', 'weekly', 'monthly'
 * @returns {Promise<object[]>}
 */
async function getContributorsWithSubmissions(digestFrequency) {
  const [rows] = await db.query(
    `SELECT u.userID, u.firstname, u.username, u.email, u.addedOn, u.digestFrequency
     FROM users u
     WHERE u.digestFrequency = ?
       AND u.status = 'Active'
       AND u.roleName != 'user'
       AND EXISTS (SELECT 1 FROM audio a WHERE a.creatorID = u.userID)`,
    [digestFrequency]
  );
  return rows;
}

/**
 * Returns active contributors who have never submitted any audio.
 * These users receive the contributor-digest-reminder instead of the digest.
 * @returns {Promise<object[]>}
 */
async function getContributorsWithNoSubmissions() {
  const [rows] = await db.query(
    `SELECT u.userID, u.firstname, u.username, u.email, u.addedOn
     FROM users u
     WHERE u.roleName = 'contributor'
       AND u.status = 'Active'
       AND NOT EXISTS (SELECT 1 FROM audio a WHERE a.creatorID = u.userID)`
  );
  return rows;
}

// ─── Var builders ─────────────────────────────────────────────────────────────

/**
 * Builds template variables for the contributor digest email.
 * Fetches pending approval/disapproval events and profile stats.
 * Returns commIDs of included events so they can be marked sentAt after send.
 * @param {object} user
 * @returns {Promise<{vars: object, commIDs: number[]}>}
 */
async function buildDigestVars(user) {
  const { userID, firstname, username, addedOn } = user;

  const [events] = await db.query(
    `SELECT commID, commType, payload FROM userComms
     WHERE userID = ? AND sentAt IS NULL
       AND commType IN ('audio_approved', 'audio_disapproved')
     ORDER BY createdAt ASC`,
    [userID]
  );

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
      disapproved.push({ audioID: payload.audioID, title: payload.title, notes: payload.notes || '' });
    }
  }

  const { audioRow, recipeRow, topPlays, recentPendingRows } = await getProfileStats(userID);

  const recentPending = recentPendingRows.map(r => ({
    audioID: r.audioID,
    title: r.title,
    date: formatMonthYear(r.createDate),
  }));

  const vars = {
    firstname:          firstname || username,
    username,
    memberSince:        formatMonthYear(addedOn),
    lastContributed:    formatMonthYear(audioRow.lastContributed),
    totalPlays:         parseInt(audioRow.totalPlays, 10) || 0,
    audioContributed:   audioRow.total || 0,
    audioPending:       audioRow.pending || 0,
    recipesContributed: recipeRow.total || 0,
    recipesPending:     recipeRow.pending || 0,
    hasRecipes:         (recipeRow.total || 0) > 0,
    topPlays,
    hasTopPlays:        topPlays.length > 0,
    recentPending,
    hasRecentPending:   recentPending.length > 0,
    approved,
    hasApproved:        approved.length > 0,
    disapproved,
    hasDisapproved:     disapproved.length > 0,
    unsubscribeUrl:     makeUnsubscribeUrl(userID),
    digestPrefsUrl:     makeDigestPrefsUrl(username),
  };

  return { vars, commIDs };
}

/**
 * Builds template variables for the contributor-digest-reminder email.
 * Sent to contributors who have never submitted audio.
 * @param {object} user
 * @returns {Promise<{vars: object, commIDs: []}>}
 */
async function buildReminderVars(user) {
  const { userID, firstname, username } = user;
  const vars = {
    firstname:      firstname || username,
    username,
    unsubscribeUrl: makeUnsubscribeUrl(userID),
    digestPrefsUrl: makeDigestPrefsUrl(username),
  };
  return { vars, commIDs: [] };
}

// ─── Schedule table ───────────────────────────────────────────────────────────
/**
 * Schedule table. Each entry defines one email type. The runner iterates this
 * table daily and applies the cadence + missed-send logic to each recipient.
 *
 * @type {Array<{
 *   name: string,
 *   template: string,
 *   commType: string,
 *   windowDays: number|null,
 *   isScheduledToday: (user: object) => boolean,
 *   getRecipients: () => Promise<object[]>,
 *   buildVars: (user: object) => Promise<{vars: object, commIDs: number[]}>
 * }>}
 *
 * windowDays: how many days back to look for a prior send when checking for
 *   missed sends. null = no fallback check (daily always fires).
 * commType: sentinel value inserted into userComms on send; also queried by
 *   hasGottenLastDigest() to gate re-sends within the window.
 */
const schedules = [
  {
    name:             'daily-digest',
    template:         'contributor-digest',
    commType:         'digest_sent',
    windowDays:       null,
    isScheduledToday: () => true,
    getRecipients:    () => getContributorsWithSubmissions('daily'),
    buildVars:        buildDigestVars,
  },
  {
    name:             'weekly-digest',
    template:         'contributor-digest',
    commType:         'digest_sent',
    windowDays:       6,
    isScheduledToday: () => isWeeklyDay(),
    getRecipients:    () => getContributorsWithSubmissions('weekly'),
    buildVars:        buildDigestVars,
  },
  {
    name:             'monthly-digest',
    template:         'contributor-digest',
    commType:         'digest_sent',
    windowDays:       27,
    isScheduledToday: () => isNthWeekdayOfMonth(),
    getRecipients:    () => getContributorsWithSubmissions('monthly'),
    buildVars:        buildDigestVars,
  },
  {
    name:             'contributor-reminder',
    template:         'contributor-digest-reminder',
    commType:         'reminder_sent',
    windowDays:       27,
    isScheduledToday: () => isNthWeekdayOfMonth(),
    getRecipients:    () => getContributorsWithNoSubmissions(),
    buildVars:        buildReminderVars,
  },
  // TODO: create user-reminder template, then uncomment this schedule entry.
  // isAnniversaryWindow(), getUsersForYearlyNudge(), and buildUserReminderVars()
  // are also stubbed out but commented until the template exists.
  //
  // {
  //   name:             'user-reminder',
  //   template:         'user-reminder',
  //   commType:         'user_reminder_sent',
  //   windowDays:       350,
  //   isScheduledToday: (user) => isAnniversaryWindow(user.addedOn),
  //   getRecipients:    () => getUsersForYearlyNudge(),
  //   buildVars:        buildUserReminderVars,
  // },
];

// ─── Main runner ─────────────────────────────────────────────────────────────

/**
 * Main entry point. Iterates the schedule table and sends emails to all
 * qualifying recipients. For each schedule + recipient pair:
 *   - Sends if today is the scheduled day (happy path), OR
 *   - Sends if the user missed their last send within windowDays (fallback)
 *
 * After sending: event rows are marked sentAt, a sentinel row is logged.
 * @returns {Promise<void>}
 */
async function runDigest() {
  logger.info('digestRunner: starting daily run');

  for (const schedule of schedules) {
    const recipients = await schedule.getRecipients();
    logger.info(`digestRunner: [${schedule.name}] ${recipients.length} potential recipient(s)`);

    for (const user of recipients) {
      try {
        const scheduledToday = schedule.isScheduledToday(user);
        const missed = schedule.windowDays
          ? !(await hasGottenLastDigest(user.userID, schedule.commType, schedule.windowDays))
          : false;

        if (!scheduledToday && !missed) continue;

        const { vars, commIDs } = await schedule.buildVars(user);
        await sendTemplate(schedule.template, vars, { to: user.email, from: FROM.noreply });

        if (commIDs.length > 0) {
          await db.query(
            `UPDATE userComms SET sentAt = NOW() WHERE commID IN (?)`,
            [commIDs]
          );
        }

        await logSent(user.userID, schedule.commType);
        logger.info(`digestRunner: [${schedule.name}] sent to ${user.username}`);
      } catch (err) {
        logger.error(`digestRunner: [${schedule.name}] failed for ${user.username}: ${err.message}`);
      }
    }
  }

  logger.info('digestRunner: run complete');
}

module.exports = { runDigest };
