#!/usr/bin/env node
// DuckDuckGo image search — no API key needed
// Usage: node test-ddg.js "Norman McLaren Synchromy"

const query = process.argv.slice(2).join(' ') || 'Tom Waits Rain Dogs album cover';

async function ddgImages(q) {
  // Step 1: get the vqd token DDG needs for image search
  const initRes = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(q)}&iax=images&ia=images`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
  });
  const initHtml = await initRes.text();
  const vqd = initHtml.match(/vqd=['"]([^'"]+)['"]/)?.[1];
  if (!vqd) throw new Error('Could not extract vqd token');

  // Step 2: fetch image results using the token
  const imgRes = await fetch(
    `https://duckduckgo.com/i.js?q=${encodeURIComponent(q)}&vqd=${vqd}&o=json&p=1&s=0&u=bing&f=,,,,,`,
    { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                 'Referer': 'https://duckduckgo.com/' } }
  );
  const data = await imgRes.json();
  return data.results || [];
}

async function main() {
  console.log(`Query: "${query}"\n`);
  const results = await ddgImages(query);
  console.log(`${results.length} results\n`);
  results.slice(0, 5).forEach((r, i) => {
    console.log(`${i + 1}. ${r.title}`);
    console.log(`   ${r.image}`);
    console.log(`   ${r.width}x${r.height} — ${r.source}\n`);
  });
}

main().catch(err => { console.error(err.message); process.exit(1); });
