#!/usr/bin/env node
// Quick prototype: Bing Image Search for album art
// Usage: node scripts/test-bing-image.js "Tom Waits Rain Dogs"
//
// Requires BING_SEARCH_API_KEY in AdminServer/.env

'use strict';

process.env.NODE_PATH = require('path').join(__dirname, '../AdminServer/node_modules');
require('module').Module._initPaths();
require('dotenv').config({ path: require('path').join(__dirname, '../AdminServer/.env') });

const query  = process.argv.slice(2).join(' ') || 'Tom Waits Rain Dogs';
const key    = process.env.BING_SEARCH_API_KEY;
const count  = 5;

if (!key) { console.error('Missing BING_SEARCH_API_KEY in AdminServer/.env'); process.exit(1); }

async function main() {
  const url = `https://api.bing.microsoft.com/v7.0/images/search?q=${encodeURIComponent(query + ' album cover')}&count=${count}&imageType=Photo&aspect=Square`;

  console.log(`Query: "${query}"\n`);

  const res  = await fetch(url, { headers: { 'Ocp-Apim-Subscription-Key': key } });
  if (!res.ok) { console.error(`Bing error ${res.status}:`, await res.text()); process.exit(1); }

  const data = await res.json();
  const results = data.value || [];

  if (results.length === 0) { console.log('No results.'); return; }

  results.forEach((r, i) => {
    console.log(`${i + 1}. ${r.name}`);
    console.log(`   ${r.contentUrl}`);
    console.log(`   ${r.width}x${r.height} — ${r.hostPageDomainFriendlyName}\n`);
  });
}

main().catch(err => { console.error(err); process.exit(1); });
