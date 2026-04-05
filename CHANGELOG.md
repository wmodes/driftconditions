# Changelog

All notable changes to this project are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

---

## [2026-04-04]

### Added
- `formatDuration(seconds)` utility in `formatUtils.js` — converts raw seconds to `m:ss` format
- Recipe List: inline Quick Edit row (Title, Status, Description, Classification, Tags, Comments) matching the Audio List quick-edit pattern
- Duplicate submission check on audio upload — checksum match rejects with a clear error; filename-only match warns but proceeds; `checksum` column added to `audio` table; existing records backfilled via `scripts/backfill-checksums.js`
- Breadcrumb navigation at top and bottom of Recipe Edit page, matching Audio Edit; added "Add New" link
- "Add New" link added to Recipe View and Audio View breadcrumbs
- Breadcrumb rendered at top of Audio View and Recipe View pages, matching Edit pages

### Changed
- Audio duration display updated from raw seconds to `m:ss` format in Audio List, Audio Edit, and Audio View
- Recipe View and Audio View widened from 640px to 850px (`view-wrapper` → `edit-wrapper`) to match their Edit counterparts
- Playlist time labels offset by one position to better approximate actual Icecast playback start time

### Fixed
- Profile pages now publicly accessible without login — unauthenticated users see basic public fields; `profile` added to public contexts in auth check and profile route gracefully handles missing token
- Play/stop icon in Audio List persisting after audio playback ends naturally
- "Unsaved changes" warning appearing on Audio Edit even without any user edits — caused by `TagInput` firing `onTagChange` on mount, and stale Redux `unsavedChanges` state carried over from previous pages
- "Views" typo in Audio Edit breadcrumb corrected to "View"
- Error responses standardized across all server routes, Redux thunks, and frontend pages — errors now surface as meaningful one-line messages rather than raw HTTP errors or generic fallbacks
- Sign-in wrong credentials no longer exposes raw HTTP status code to the user
- Profile edit, audio edit, recipe edit, and role list: switching from success to error no longer shows both messages simultaneously

---

## [2026-04-02]

### Added
- `scripts/user-activity-30-days.sh` — server-side report script querying both the DB and journald logs for login activity over the last 30 days: unique users, signups, password resets, successful sign-ins, rate limit hits, security rejections, and failed login attempts

### Changed
- Log level lowered from `debug` to `info` in `authRoutes.js` and `audioRoutes.js` — debug logging was left on during development
- Configured `journald` on production server for persistent log storage with 35-day retention and 200MB cap

### Fixed
- Homepage "hit us up" mailto link: fixed subject line case; appends username in email body when user is logged in
- Homepage "Okay." contact link: replaced React Router `<Link>` with `<a target="_blank">` so mailto opens in a new window

---

## [2026-04-01]

### Added
- **OAuth 2.0 support** — users can now sign in with Google, GitHub, or Discord in addition to local email/password
  - OAuth callback routes for all three providers
  - CSRF state parameter protection on all OAuth flows
  - Account linking: OAuth logins matching an existing email are linked to the existing account rather than creating a duplicate
  - New `userIdentities` table to store provider/ID pairs per user
- **Password reset flow** — full forgot-password/reset-password cycle via time-limited single-use tokens delivered by email
  - `POST /api/auth/forgotpassword` and `POST /api/auth/reset-password` routes
  - `utils/mailer.js` — Ethereal fake SMTP in development, Postfix in production (requires `NODE_ENV=production`)
  - Frontend pages: `ForgotPassword.js`, `ResetPassword.js`; "Forgot password?" link added to sign-in page
  - `passwordResetTokens` DB table
- **User avatars from OAuth providers** — avatar URL captured on every OAuth login ("last login wins") and displayed on the profile page with fallback to FeatherIcon silhouette
  - `avatar_url` column added to `users` table
  - Google: `claims.picture`, GitHub: `ghUser.avatar_url`, Discord: constructed CDN URL
- **reCAPTCHA v3** on local sign-in and sign-up to reduce bot traffic; lazy-loads the reCAPTCHA script
- **Rate limiting** — separate per-IP limiters for credential routes (`/signin`, `/signup`) and OAuth routes
- **Email-or-username login** — local sign-in now accepts either username or email address
- **Editable username** — users can now change their username from the profile edit page; OAuth-created usernames (auto-generated from provider display name) can be updated after first login
- **Profile completeness check** — post-login redirect to profile edit page when required fields are missing
- **`displayName` and `lastLoginAt` columns** added to `users` table
- **Env config templates** — `setupfiles/env.local` and `setupfiles/env.server` with full documentation of all required variables and behavioral differences between dev and prod

### Changed
- OAuth callback URLs made configurable via environment variables (with localhost defaults for dev)
- `useAuthCheckAndNavigate` refactored to always await the auth check on all pages, including public ones — only redirects on failure for protected pages; fixes login state lost on reload
- Backend `POST /api/auth/check` now skips permission enforcement for known public page contexts (`homepage`, `howitworks`, `signin`, `signup`, etc.) — fixes playlist breaking on homepage for unauthenticated users
- `HowItWorks.js` page fully rewritten with improved voice, structure, and accuracy
- Caddyfile updated for production server proxy configuration

### Fixed
- Login state lost on page reload when navigating to public pages (homepage, How It Works)
- Playlist disappearing on homepage after auth check introduced
- Discord OAuth callback failing on server due to missing `:8080` port in redirect URI (fixed in Discord developer console)
- Forgot password emails not sending on server — root cause was missing `NODE_ENV=production` in server `.env`

---

## [2025-02-19]

### Added
- Render roulette feature

---

## [2024-11-11]

### Added
- User audio download functionality

---

## [2024-09-07]

### Changed
- Improved README documentation

---

## [2024-11-08]

### Changed
- Disabled file-based logging transport
