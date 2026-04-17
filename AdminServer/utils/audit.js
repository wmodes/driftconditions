/**
 * @file audit.js
 * @description Write audit records for consequential state changes.
 *
 * Captures who changed what, from what value, to what value.
 * Fire-and-forget — audit failures never propagate to the caller.
 *
 * Payload shape (stored as TEXT-encoded JSON):
 *   { before: { ...fields }, after: { ...fields }, meta: { ...extras } }
 *
 * actionBy = userID of the actor; NULL for system-initiated changes.
 */

const { database: db } = require('config');
const logger = require('config/logger').custom('AdminServer', 'info');

// System actor — userID 1 ('nobody') is a disabled admin account used for
// automated/system-initiated audit events that have no human actor.
const SYSTEM_USER = 1;

/**
 * Log a state-change event to the audit table.
 * @param {Object} opts
 * @param {string}        opts.tableName  - DB table affected (e.g. 'users', 'roles')
 * @param {string|number} opts.recordID   - PK of the affected row
 * @param {string}        opts.actionType - Short snake_case label (e.g. 'role_change')
 * @param {Object|null}   [opts.before]   - Relevant field values before the change
 * @param {Object|null}   [opts.after]    - Relevant field values after the change
 * @param {Object|null}   [opts.meta]     - Extra context (e.g. { notified: true, provider: 'github' })
 * @param {number|null}   [opts.actionBy] - userID of the actor; omit for system actions (defaults to SYSTEM_USER)
 */
async function logAudit({ tableName, recordID, actionType, before = null, after = null, meta = null, actionBy = SYSTEM_USER }) {
  try {
    const payload = JSON.stringify({
      ...(before !== null && { before }),
      ...(after  !== null && { after }),
      ...(meta   !== null && { meta }),
    });
    await db.query(
      `INSERT INTO audit (tableName, recordID, actionType, payload, actionBy)
       VALUES (?, ?, ?, ?, ?)`,
      [tableName, String(recordID), actionType, payload, actionBy]
    );
    logger.debug(`audit: ${actionType} on ${tableName}#${recordID} by userID=${actionBy}`);
  } catch (err) {
    // Audit failures must never break the primary operation
    logger.error(`audit: failed to write ${actionType} for ${tableName}#${recordID}: ${err.message}`);
  }
}

module.exports = { logAudit, SYSTEM_USER };
