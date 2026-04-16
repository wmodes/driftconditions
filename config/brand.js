/**
 * brand.js — Single source of truth for DriftConditions site identity.
 *
 * ⚠️  SYMLINK WARNING: This file is symlinked into AdminClient/src/config/brand.js
 * so the frontend can import it within CRA's src/ boundary. There is only ONE
 * file — edits here are immediately visible to both backend and frontend.
 * Do NOT copy this file. Do NOT edit the symlink target directly.
 * If the symlink breaks (git clone, rsync, backup restore), recreate it
 * from the project root:
 *   ln -s ../../../config/brand.js AdminClient/src/brand/brand.js
 *             ^-- source (this file)   ^-- symlink location
 *
 * Consumed by: AdminServer (mailer.js), AdminClient (Navigation, Homepage, index.html).
 * CSS-specific brand values (colors) live alongside this file in brand/brand.css.
 *
 * NOT for dynamic/generated content (project name variants, location,
 * homepage flavor text) — those live in randomUtils.js.
 */

const brand = {
  // ─── Site Identity ──────────────────────────────────────────────────────────

  name: 'DriftConditions',
  tagline: 'The Uncanny Sound of Serendipity',

  // Short description (meta name="description", twitter:description)
  descriptionShort: 'An algorithmically generated surreal audio stream',

  // Long description (og:description)
  descriptionLong: 'Where mysterious soundscapes meet the chaos and serendipity of late-night radio tuning.',

  // Full sentence used in <title> and social cards
  descriptionFull: 'An online audio station where mysterious soundscapes meet the chaos and serendipity of late-night radio tuning.',

  // ─── URLs ───────────────────────────────────────────────────────────────────

  siteUrl: 'https://driftconditions.org',

  // Static social/OG share image — social crawlers need a fixed URL.
  // The actual homepage image rotates dynamically; see config.app.homepageImages.
  ogImage: 'https://driftconditions.org/img/night-drive-woodcut.png',

  // ─── Colors ─────────────────────────────────────────────────────────────────
  // CSS-specific brand values (colors, fonts, etc.) live in brand.css, not here.
  // See: AdminClient/src/brand/brand.css (and config/brand.css for backend templates)

  // ─── Email ──────────────────────────────────────────────────────────────────

  email: {
    // Sender display name used in all outgoing email From: headers
    fromName: 'DriftConditions',

    // Automated system messages (password reset, account actions)
    noreply: 'noreply@driftconditions.org',

    // Personal welcome messages from Wes
    welcome: 'wes@driftconditions.org',

    // General enquiries / contact
    contact: 'info@driftconditions.org',
  },
};

module.exports = brand;
