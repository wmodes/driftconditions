// utils/mailer.js - Email transport utility
// Uses Ethereal fake SMTP in development (logs preview URL to console)
// Uses local Postfix sendmail in production

const nodemailer = require('nodemailer');
const logger = require('config/logger').custom('AdminServer', 'info');

const FROM_ADDRESS = '"DriftConditions" <noreply@driftconditions.org>';
const isDev = process.env.NODE_ENV !== 'production';

// Create the appropriate transporter based on environment
async function createTransporter() {
  if (isDev) {
    // Ethereal fake SMTP — no mail actually sent, preview URL logged to console
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  } else {
    // Production — send via local Postfix
    return nodemailer.createTransport({
      sendmail: true,
      newline: 'unix',
      path: '/usr/sbin/sendmail',
    });
  }
}

/**
 * Send an email.
 * @param {Object} opts
 * @param {string} opts.to - Recipient email address
 * @param {string} opts.subject - Email subject
 * @param {string} opts.text - Plain text body
 * @param {string} opts.html - HTML body
 */
async function sendMail({ to, subject, text, html }) {
  const transporter = await createTransporter();
  const info = await transporter.sendMail({
    from: FROM_ADDRESS,
    to,
    subject,
    text,
    html,
  });

  if (isDev) {
    // Log the Ethereal preview URL so devs can inspect the email
    logger.info(`mailer: preview URL: ${nodemailer.getTestMessageUrl(info)}`);
  }

  logger.info(`mailer: sent "${subject}" to ${to} (messageId=${info.messageId})`);
  return info;
}

module.exports = { sendMail };
