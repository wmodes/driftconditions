/**
 * @file digestRunner.js
 * @description Daily digest runner for all user email types.
 *
 * Fires once daily via cron. Iterates a schedule table — each entry defines
 * a cadence, a recipient query, and a var builder. For each recipient the
 * runner checks two conditions:
 *
 *   1. isScheduledToday(user) — happy path; is today the right send day?
 *   2. needsFallbackDigest — has enough time passed without a send to trigger
 *      the monthly floor? Catches missed sends when the server was down.
 *
 * After sending, event rows in userComms are marked sentAt = NOW(), and a
 * sentinel row (e.g. commType='digest_sent') is inserted so hasGottenLastDigest()
 * can gate against duplicate sends within the cadence window.
 *
 * Schedule:
 *   daily    — contributors/editors/mods/admins with submissions, digestFrequency='daily';
 *              fires when there are new events OR on the monthly fallback day (no daily noise
 *              during quiet periods, but guaranteed monthly contact regardless)
 *   weekly   — same, digestFrequency='weekly'; fires when there are new events OR on the monthly fallback day
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
 * Returns the date of the most recent send of commType for this user, or null.
 * Single query replacing the old hasSentToday + hasGottenLastDigest pair.
 * @param {number} userID
 * @param {string} commType
 * @returns {Promise<Date|null>}
 */
async function getLastDigestSent(userID, commType) {
  const [[row]] = await db.query(
    `SELECT createdAt FROM userComms
     WHERE userID = ? AND commType = ?
     ORDER BY createdAt DESC LIMIT 1`,
    [userID, commType]
  );
  return row ? new Date(row.createdAt) : null;
}

/** Returns fractional days since a past date. */
function daysSince(date) {
  return (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
}

/** True if the last send was today — prevents double-sends if runner fires twice. */
function sentToday(lastSent) {
  return !!lastSent && daysSince(lastSent) < 1;
}

/** True if the last send falls within the user's normal frequency window. */
function sentWithinFreqWindow(lastSent, freqDays) {
  return !!lastSent && !!freqDays && daysSince(lastSent) < freqDays;
}

/** True if enough time has passed without a send to trigger the fallback cadence. */
function needsFallbackDigest(lastSent, fallbackDays) {
  return !!fallbackDays && (!lastSent || daysSince(lastSent) >= fallbackDays);
}

/**
 * Inserts a sentinel row into userComms recording that a digest/reminder was sent.
 * @param {number} userID
 * @param {string} commType - e.g. 'digest_sent', 'reminder_sent'
 * @param {object} payload - structured metadata: reason, template, daysSinceLastSend
 * @returns {Promise<void>}
 */
async function logSent(userID, commType, payload = {}) {
  await db.query(
    `INSERT INTO userComms (userID, commType, payload) VALUES (?, ?, ?)`,
    [userID, commType, JSON.stringify(payload)]
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

/**
 * Returns true if the user has any unsent approval/disapproval events queued.
 * Used by the daily-digest to suppress sends when there's nothing new.
 * @param {number} userID
 * @returns {Promise<boolean>}
 */
async function hasNewEvents(userID) {
  const [[row]] = await db.query(
    `SELECT 1 FROM userComms
     WHERE userID = ? AND sentAt IS NULL
       AND commType IN ('audio_approved', 'audio_disapproved')
     LIMIT 1`,
    [userID]
  );
  return !!row;
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
  const { userID, firstname, username, addedOn, digestFrequency } = user;

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
    digestFrequency,
    // Set when a daily/weekly user has no new events and is receiving the monthly fallback send
    fallbackFrequency:  (['daily', 'weekly'].includes(digestFrequency) && events.length === 0) ? dc.fallbackFrequency : null,
    unsubscribeUrl:     makeUnsubscribeUrl(userID),
    digestPrefsUrl:     makeDigestPrefsUrl(username),
  };

  return { vars, commIDs };
}

/**
 * Returns active users (role='user') who signed up at least 30 days ago.
 * Anniversary check is done per-user in isScheduledToday via isAnniversaryWindow.
 * @returns {Promise<object[]>}
 */
async function getUsersForYearlyNudge() {
  const [rows] = await db.query(
    `SELECT u.userID, u.firstname, u.username, u.email, u.addedOn
     FROM users u
     WHERE u.roleName = 'user'
       AND u.status = 'Active'
       AND u.digestFrequency = 'yearly'
       AND DATEDIFF(NOW(), u.addedOn) >= 30`
  );
  return rows;
}

/**
 * Returns true if today falls within anniversaryWindowDays after the user's
 * signup anniversary. Checks both this year and last year to handle the
 * year-boundary edge case (e.g. Dec 31 anniversary, server up Jan 2).
 * Combined with hasGottenLastDigest(350), the window safely catches missed
 * sends without risk of double-sending.
 * @param {Date|string} addedOn
 * @returns {boolean}
 */
function isAnniversaryWindow(addedOn) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const yearOffset of [0, -1]) {
    const anniversary = new Date(addedOn);
    anniversary.setFullYear(today.getFullYear() + yearOffset);
    anniversary.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today - anniversary) / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays < dc.anniversaryWindowDays) return true;
  }
  return false;
}

/**
 * Builds template variables for the yearly user-reminder email.
 * Sent to users (role='user') on their signup anniversary.
 * @param {object} user
 * @returns {Promise<{vars: object, commIDs: []}>}
 */
async function buildUserReminderVars(user) {
  const { userID, firstname, username } = user;
  const vars = {
    firstname:    firstname || username,
    username,
    contactEmail: brand.email.contact,
    unsubscribeUrl: makeUnsubscribeUrl(userID),
  };
  return { vars, commIDs: [] };
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
    freqDays:         null, // daily: sentToday() is sufficient; no additional freq window
    fallbackDays:     27,   // monthly minimum contact
    isScheduledToday: async (user) => await hasNewEvents(user.userID),
    getRecipients:    () => getContributorsWithSubmissions('daily'),
    buildVars:        buildDigestVars,
  },
  {
    name:             'weekly-digest',
    template:         'contributor-digest',
    commType:         'digest_sent',
    freqDays:         7,
    fallbackDays:     27,
    isScheduledToday: async (user) => isWeeklyDay() && await hasNewEvents(user.userID),
    getRecipients:    () => getContributorsWithSubmissions('weekly'),
    buildVars:        buildDigestVars,
  },
  {
    name:             'monthly-digest',
    template:         'contributor-digest',
    commType:         'digest_sent',
    freqDays:         27,
    fallbackDays:     27,
    isScheduledToday: () => isNthWeekdayOfMonth(),
    getRecipients:    () => getContributorsWithSubmissions('monthly'),
    buildVars:        buildDigestVars,
  },
  {
    name:             'contributor-reminder',
    template:         'contributor-digest-reminder',
    commType:         'reminder_sent',
    freqDays:         27,
    fallbackDays:     27,
    isScheduledToday: () => isNthWeekdayOfMonth(),
    getRecipients:    getContributorsWithNoSubmissions,
    buildVars:        buildReminderVars,
  },
  {
    name:             'user-reminder',
    template:         'user-reminder',
    commType:         'user_reminder_sent',
    freqDays:         350,
    fallbackDays:     null, // anniversary window is self-contained; no separate fallback
    isScheduledToday: (user) => isAnniversaryWindow(user.addedOn),
    getRecipients:    getUsersForYearlyNudge,
    buildVars:        buildUserReminderVars,
  },
];

// ─── Main runner ─────────────────────────────────────────────────────────────

/**
 * Main entry point. Iterates the schedule table and sends emails to all
 * qualifying recipients. For each schedule + recipient pair:
 * For each recipient: skip if already sent today, skip if within their freq window,
 * send if today is their scheduled day or the fallback cadence has elapsed.
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
        const lastSent = await getLastDigestSent(user.userID, schedule.commType);
        if (sentToday(lastSent) || sentWithinFreqWindow(lastSent, schedule.freqDays)) continue;

        const scheduledToday = await schedule.isScheduledToday(user);
        const fallback = needsFallbackDigest(lastSent, schedule.fallbackDays);
        if (!scheduledToday && !fallback) continue;

        const { vars, commIDs } = await schedule.buildVars(user);
        await sendTemplate(schedule.template, vars, { to: user.email, from: FROM.noreply });

        if (commIDs.length > 0) {
          await db.query(
            `UPDATE userComms SET sentAt = NOW() WHERE commID IN (?)`,
            [commIDs]
          );
        }

        const dayCount = lastSent ? Math.floor(daysSince(lastSent)) : null;
        const sinceText = dayCount !== null ? `${dayCount}d since last send` : 'never sent before';
        await logSent(user.userID, schedule.commType, {
          template:          schedule.template,
          reason:            scheduledToday ? 'scheduled' : 'fallback',
          daysSinceLastSend: dayCount,
          reasonText:        scheduledToday ? `${schedule.name}, scheduled` : `${schedule.name}, fallback — ${sinceText}`,
        });
        logger.info(`digestRunner: [${schedule.name}] sent to ${user.username}`);
      } catch (err) {
        logger.error(`digestRunner: [${schedule.name}] failed for ${user.username}: ${err.message}`);
      }
    }
  }

  logger.info('digestRunner: run complete');
}

module.exports = { runDigest };
