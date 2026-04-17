/**
 * @file mailer.js
 * @description Email transport utility.
 * Uses Ethereal fake SMTP in development (logs preview URL to console).
 * Uses local Postfix sendmail in production.
 */

const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const Handlebars = require('handlebars');
const logger = require('config/logger').custom('AdminServer', 'info');
const brand = require('config/brand');

// ─── Template setup ──────────────────────────────────────────────────────────

const TEMPLATE_DIR = path.join(__dirname, '../templates/email');

// Register all partials from templates/email/partials/ at startup
const partialsDir = path.join(TEMPLATE_DIR, 'partials');
if (fs.existsSync(partialsDir)) {
  fs.readdirSync(partialsDir).forEach((file) => {
    const name = path.basename(file, path.extname(file));
    const content = fs.readFileSync(path.join(partialsDir, file), 'utf8');
    Handlebars.registerPartial(name, content);
  });
}

// Load and cache layout templates.
// Plain text layout uses noEscape to prevent HTML-encoding of apostrophes etc.
const layoutHtml = fs.readFileSync(path.join(TEMPLATE_DIR, 'layout.html'), 'utf8');
const layoutTxt  = fs.readFileSync(path.join(TEMPLATE_DIR, 'layout.txt'),  'utf8');
const compiledLayoutHtml = Handlebars.compile(layoutHtml);
const compiledLayoutTxt  = Handlebars.compile(layoutTxt, { noEscape: true });

// Build a formatted From: header from brand config
// e.g. '"DriftConditions" <noreply@driftconditions.org>'
const fromAddr = (address) => `"${brand.email.fromName}" <${address}>`;

const FROM = {
  noreply: fromAddr(brand.email.noreply),   // automated system messages
  welcome:  fromAddr(brand.email.welcome),   // personal welcome from Wes
  contact:  fromAddr(brand.email.contact),   // general enquiries
};

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Creates the appropriate nodemailer transporter based on environment.
 * Development: Ethereal fake SMTP (no mail actually sent).
 * Production: local Postfix via sendmail.
 * @returns {Promise<import('nodemailer').Transporter>}
 */
// Cached transporter — created once per process so all emails in a run share
// the same Ethereal account (otherwise each send gets a fresh ephemeral account
// and the preview URLs are unreachable after the call returns).
let _transporter = null;

async function createTransporter() {
  if (_transporter) return _transporter;
  if (isDev) {
    // Ethereal fake SMTP — no mail actually sent, preview URL logged to console
    const testAccount = await nodemailer.createTestAccount();
    logger.info(`mailer: Ethereal test account: ${testAccount.user} — https://ethereal.email`);
    _transporter = nodemailer.createTransport({
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
    _transporter = nodemailer.createTransport({
      sendmail: true,
      newline: 'unix',
      path: '/usr/sbin/sendmail',
    });
  }
  return _transporter;
}

/**
 * Send an email.
 * @param {Object} opts
 * @param {string} opts.to - Recipient email address
 * @param {string} opts.subject - Email subject
 * @param {string} opts.text - Plain text body
 * @param {string} opts.html - HTML body
 * @param {string} [opts.from] - From address; defaults to FROM.noreply.
 *   Use FROM.welcome for personal welcome emails, FROM.contact for enquiries.
 */
async function sendMail({ to, subject, text, html, from = FROM.noreply }) {
  const transporter = await createTransporter();
  const info = await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });

  if (isDev) {
    // Log the Ethereal preview URL so devs can inspect the email
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      logger.info(`mailer: preview URL: ${previewUrl}`);
    } else {
      logger.info(`mailer: preview URL unavailable — check https://ethereal.email (messageId=${info.messageId})`);
    }
  }

  logger.info(`mailer: sent "${subject}" to ${to} (messageId=${info.messageId})`);
  return info;
}

/**
 * Render a named email template and send it.
 *
 * Template files live in templates/email/<templateName>/:
 *   subject.txt  — Handlebars template for the subject line
 *   body.html    — Handlebars template for the HTML body (content only, no chrome)
 *   body.txt     — Handlebars template for the plain text body (content only)
 *
 * The content is wrapped in layout.html / layout.txt automatically.
 * Brand variables (siteName, siteUrl) are merged in automatically.
 *
 * @param {string} templateName - Subdirectory name under templates/email/
 * @param {Object} variables - Template variables (e.g. { firstname, resetUrl })
 * @param {Object} opts
 * @param {string} opts.to - Recipient email address
 * @param {string} [opts.from] - From address; defaults to FROM.noreply
 */
async function sendTemplate(templateName, variables, { to, from = FROM.noreply }) {
  const templateDir = path.join(TEMPLATE_DIR, templateName);

  // Merge brand globals so every template can use {{siteName}}, {{siteUrl}}, etc.
  const ctx = {
    siteName: brand.name,
    siteUrl:  brand.siteUrl,
    ...variables,
  };

  // Compile and render subject
  const subjectTpl = fs.readFileSync(path.join(templateDir, 'subject.txt'), 'utf8');
  const subject = Handlebars.compile(subjectTpl)(ctx).trim();

  // Compile inner body templates, then wrap in layout.
  // Plain text uses noEscape to prevent Handlebars from HTML-encoding apostrophes etc.
  const innerHtml = Handlebars.compile(fs.readFileSync(path.join(templateDir, 'body.html'), 'utf8'))(ctx);
  const innerTxt  = Handlebars.compile(fs.readFileSync(path.join(templateDir, 'body.txt'),  'utf8'), { noEscape: true })(ctx);

  const html = compiledLayoutHtml({ ...ctx, body: innerHtml });
  const text = compiledLayoutTxt({ ...ctx, body: innerTxt });

  return sendMail({ to, from, subject, text, html });
}

module.exports = { sendMail, sendTemplate, FROM };
