// Quick mailer utility test — run with: node tests/test-email.js
const { sendTemplate, FROM } = require('../utils/mailer');

async function main() {
  const user = { firstname: 'Wes', username: 'wmodes', to: 'test@example.com' };

  await sendTemplate('role-change-contributor', {
    firstname: user.firstname,
    username: user.username,
  }, { to: user.to, from: FROM.welcome });

  await sendTemplate('audio-moderation', {
    firstname: user.firstname,
    username: user.username,
    clipTitle: 'Rain on a tin roof',
    action: 'approved',
    approved: true,
    notes: '',
  }, { to: user.to, from: FROM.noreply });

  await sendTemplate('audio-moderation', {
    firstname: user.firstname,
    username: user.username,
    clipTitle: 'My podcast episode',
    action: 'rejected',
    approved: false,
    notes: 'This one is a bit too polished for the station. We tend toward rougher, more incidental sounds. Feel free to submit something else.',
  }, { to: user.to, from: FROM.noreply });
}

main().catch(console.error);
