// Quick mailer utility test — run with: node tests/test-email.js
const { sendMail } = require('../utils/mailer');

async function main() {
  await sendMail({
    to: 'test@example.com',
    subject: 'Reset your DriftConditions password',
    text: 'Click here to reset your password: https://driftconditions.org/reset-password?token=abc123\n\nThis link expires in 1 hour.\n\nIf you did not request a password reset, you can safely ignore this email.',
    html: '<p>Click here to reset your password: <a href="https://driftconditions.org/reset-password?token=abc123">Reset password</a></p><p>This link expires in 1 hour.</p><p>If you did not request a password reset, you can safely ignore this email.</p>',
  });
}

main().catch(console.error);
