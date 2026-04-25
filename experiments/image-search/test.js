#!/usr/bin/env node
// Usage: node test.js "Norman McLaren Synchromy"

const gis = require('g-i-s');

const query = process.argv.slice(2).join(' ') || 'Tom Waits Rain Dogs album cover';

gis(query, (err, results) => {
  if (err) { console.error(err); process.exit(1); }
  console.log(`Query: "${query}" — ${results.length} results\n`);
  results.slice(0, 5).forEach((r, i) => {
    console.log(`${i + 1}. ${r.url}`);
    console.log(`   ${r.width}x${r.height}`);
  });
});
