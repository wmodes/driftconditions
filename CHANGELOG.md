# Changelog

All notable changes to this project are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

---

## [2026-04-13] (3)

### Fixed
- **Track and clip `volume` now applies after `norm`** (`MixEngine.js`) — previously `volume` was applied before the effects loop, meaning `norm` would undo it entirely; `volume` is now injected as a synthetic effect and sorts between `norm` and `wave`/`duck`: structural → norm → volume → color/texture → dynamic volume

---

## [2026-04-13] (2)

### Added
- **Effect application order** (`MixEngine.js`) — effects are now sorted by category before processing, regardless of recipe order: structural → level (norm) → color → dynamic volume (wave, duck); prevents `norm` from fighting `wave`/`duck` volume modulation

### Fixed
- `wave(bridge)` on Interrupted Sermon recipe was partially defeated by `norm` appearing after it in the effects list — now resolved automatically by the effect ordering system

---

## [2026-04-13]

### Added
- **Profile stats column** (`Profile.js`, `userRoutes.js`, `index.css`) — two-column profile layout with contributor stats panel on the right; stacks responsively on narrow screens
  - Audio: contributed count, waiting for approval count (self/mod/admin only), total plays, last contributed date
  - Recipes: contributed count, waiting for approval count (self/mod/admin only)
  - Top Played Audio: top 5 clips by play count (configurable via `config.profile.topAudioCount`)
  - Waiting for Approval: most recent 3 pending clips (configurable via `config.profile.recentPendingCount`), visible to self/mod/admin only
  - Clip titles link to `/audio/view/` for users with `audioView` permission
- `viewProfileExtras` permission added to `admin`, `mod`, `editor` roles — gates pending/approval stats on others' profiles
- `config.profile` block in `AdminClient/src/config/config.js` with `topAudioCount` and `recentPendingCount`
- `getProfileStats()` helper in `userRoutes.js` — single backend call bundles all stats into the profile response

### Changed
- Playlist clip title links now gated by `audioView` permission (previously `recipeView`) — semantically correct and consistent with profile page behavior

---

## [2026-04-12] (3)

### Fixed
- `MixEngine._telephoneEffect`: `acompressor` threshold was set to `-20` (invalid dB value); corrected to `0.1` (linear equivalent of -20dB, which is what ffmpeg acompressor requires) — previously caused ffmpeg to abort with "Error setting option threshold" on any recipe using the telephone effect (e.g. Fucked Up Radio Air Check)

---

## [2026-04-12] (2)

### Added
- **`exprs3` wave effect system** (`config/config.js`, `MixEngine.js`) — replaces the old hardcoded `exprs` formula variants with a single parameterized base formula and named presets; the `_waveEffect()` resolver substitutes params at call time
  - Presets: `default`, `slow`, `slower` — select frequency family (f0/f1/f2 divisors)
  - Modifiers (composable, any order): `inverse`/`invert`/`inverted`/`counter` (invert polarity), `soft` (subtle amplitude), `lifted` (raised floor, never silent), `bridge`/`transition` (peaks at lead/counter crossover)
  - Usage: `wave()`, `wave(slow)`, `wave(slow, inverse)`, `wave(bridge)`, etc.
- `exprs3` config block with inline documentation of all parameters and modifier behavior

### Removed
- `exprs2` config block — superseded by `exprs3`; was never referenced by any code
- `exprs` config block — superseded by `exprs3`; all recipes migrated to new syntax
- `MixEngine._substituteExpressions()`, `_keysToLowercase()`, `_getListOfExprSubstNeeded()`, `_replacePlaceholder()` — only served the old `exprs` system

### Changed
- MixEngine logger reverted to `'info'` (was temporarily `'debug'` during filter development)
- All production recipes updated to use `exprs3` syntax: `subtle`→`soft`, `inverseNoise`/`interrupter`→`counter`, `subtleInverse`→`soft, counter`, `noise2`→`slow`, `fadeInNOut`→`lifted`

---

## [2026-04-12]

### Added
- `small` as an alias for `short` in `config.audio.clipLength` — natural companion to `tiny`, `medium`, `long`, `huge`; prevents silent fallback warnings in recipes that use `small` as a silence duration

### Fixed
- `ClipAdjustor._adjustFlexibleClips`: the `mixLength` track's own silence clips were budget-constrained against `this.mixDuration` (which excluded those very silences), causing budget=0 and silences scaled to zero — leading to truncated mixes; the `mixLength` track now samples silences freely within their declared ranges and updates `this.mixDuration` afterward so other tracks budget correctly
- `ClipAdjustor._adjustAdjustableTracks`: `mixLength` track now processed first so downstream tracks see the updated `mixDuration`

---

## [2026-04-11] (4)

### Added
- **`fadeout(n)` effect** (`MixEngine.js`) — smooth volume ramp-down at end of a track or clip; n sets fade duration in seconds (default 3); implemented via ffmpeg `afade t=out`
  - Clip-level: applied immediately using known `clip.duration`
  - Track-level: deferred to `_applyPendingFadeouts()` after `_determineMixDuration()` resolves, so looped tracks with Infinity duration are handled correctly
- **`duck(n)` / `duck(label)` effect** (`MixEngine.js`) — sidechaincompress ducking; the track carrying `duck()` ducks when the referenced sidechain track has signal; n is a zero-based track index or a recipe `label` string
  - `asplit` forks the sidechain track so it appears in the mix and drives the compressor simultaneously
  - Deferred to `_applyPendingDucks()` after all tracks are built; both `trackFinalLabels` entries patched atomically
  - Parameters configurable in `config.ffmpeg.filters.duck`: threshold (-30dB), ratio (20), attack (200ms), release (1000ms)
- **`repeat(n)` effect** (`ClipSelector.js`) — reuses the nth already-selected clip in the same track instead of a new DB query; n is 0-based; silence slots count toward the index but cannot be the repeat target; falls through to normal selection with a warning if n is out of range or targets a silence
- `config.ffmpeg.filters.duck` — duck compressor parameters (threshold, ratio, attack, release)
- `trackLabels[]` array in `MixEngine` tracks optional recipe `label` keys per track, enabling `duck(label)` resolution
- `experiments/duck/` and `experiments/fadeout/` — standalone ffmpeg shell scripts for validating filter behavior in isolation

### Changed
- `_applyPendingFadeouts()` now stores `trackNum` in pending entries instead of `inputLabel`, resolving the label at apply-time from `trackFinalLabels[trackNum]` — prevents collision when another deferred op updates the label before fadeout applies
- MixEngine logger set to `'debug'` temporarily for filter development (TODO: revert to `'info'`)

### Fixed
- `_waveEffect()` debug log: second line was logging `this.exprs.noise` instead of `waveFunc`

---

## [2026-04-11] (3)

### Added
- Audio List: Plays and Duration columns are now sortable
- Recipe List: Plays and Avg columns are now sortable
- All sortable column headers on Audio List and Recipe List now toggle direction on successive clicks and show ▲/▼ indicator on the active sort column; indicator styled via `.sort-indicator` at 0.8em

### Fixed
- Audio List: status sort was using unqualified `status` column — changed to `LOWER(a.status)` to avoid ambiguity with joined tables
- Recipe List: status sort was using unqualified `LOWER(status)` — changed to `LOWER(a.status)`
- RecipeForm: removed unreachable `return true` after `return JSON5.parse(content)` in `isValidJSON`

---

## [2026-04-11] (2)

### Added
- `RecipeParser.validTrackProperties`: added `label` so track `label` keys pass through normalization and are not stripped — required for upcoming `duck(label)` routing effect

### Changed
- Recipe create/new-track templates (`AdminClient/src/config/config.js`): effects list replaced with compact grouped reference (Structural / Looping / Level / Texture / Color / Routing) covering all current and upcoming effects; classification and tags comments updated to match recipe form field notes; `huge` duration corrected to 10m–2h

### Fixed
- `RecipeParser.validateRecipe` and `normalizeRecipe` were filtering tracks by `record.track !== undefined`, silently dropping any track that used `label` without a `track` key — causing validation failure and MixEngine queue stall for affected recipes; tracks array is now used as-is, presence of any tracks is sufficient

---

## [2026-04-11]

### Added
- `config.audio.silenceAdjustMaxAttempts` (default: 100) — caps rejection-sampling attempts in flexible clip duration assignment before falling back to proportional scaling

### Changed
- `ClipAdjustor._adjustSilences()` rewritten as `_adjustFlexibleClips()` — renamed to reflect that the mechanism is generic (any clip with `minLength`/`maxLength`, not just silences); algorithm replaced with rejection sampling to correctly honor recipe intent: each flexible clip is sampled independently and uniformly within its own range, so a `tiny` silence stays tiny and a `short-long` silence spreads widely regardless of its neighbors
- Pre-check added: if minimum silence durations exceed the available budget, all flexible clips are scaled down proportionally rather than entering the loop
- Fallback added: if `silenceAdjustMaxAttempts` is exceeded (feasible region too tight), the last attempt is scaled proportionally to fit the budget — preserves relative spacing between effect clips better than resetting to minimums

### Fixed
- `ClipAdjustor._adjustSilences()` infinite loop causing Node.js OOM crash — previous algorithm used a random search with a 67% fill threshold that was unreachable when silence clips couldn't span the mix duration (e.g. short silences alongside a 54-minute ambient clip); process would spin until heap exhaustion and crash MixEngine

---

## [2026-04-11]

### Added
- **Duration-weighted recipe selection** (`RecipeSelector`) — recipes with shorter average mix durations now score higher, preventing long-running recipes from dominating airtime; score = `(maxDuration - avgDuration) / (maxDuration - minDuration)`; recipes with no `avgDuration` data score 0.5 (neutral)
- `config.recipes.durationScoreWeight` (default: 1) — weight for duration subscore alongside existing `newnessScoreWeight` and `classificationScoreWeight`
- `RecipeSelector._getDurationRange()` — computes `minDuration`/`maxDuration` across eligible recipes before scoring; stored on instance, parallel to `_getEarliestAndLatestDates()`
- `RecipeSelector._calculateDurationScore()` — per-recipe duration subscore; handles NULL data (0.5 neutral), degenerate range (0.5 neutral), and normal cases
- **Usage-weighted clip selection** (`ClipSelector`) — clips with lower `timesUsed` counts score higher, broadening rotation and giving less-played clips proportionally more exposure; score = `(maxUsed - timesUsed) / (maxUsed - minUsed)`; never-used clips score 1.0; clips with no range score 0.5 (neutral)
- `config.audio.usageScoreWeight` (default: 0.5) — weight for usage subscore alongside existing `newnessScoreWeight` and `tagScoreWeight`
- `ClipSelector._getUsageRange()` — computes `minUsed`/`maxUsed` across the clip pool before scoring
- `ClipSelector._calculateUsageScore()` — per-clip usage subscore; never-used clips score 1.0, degenerate range scores 0.5 (neutral)
- `RecipeParser.resolveShortestLongestTrack()` — resolves `shortest`/`longest` mixLength markers after clip selection, when actual clip durations are known; called in Conductor between `selectAudioClips` and `adjustClipTimings`

### Changed
- `RecipeSelector._fetchRecipes()` now includes `avgDuration` in the SELECT query
- `RecipeSelector._calculateScore()` extended to include `durationScore` as third weighted term; total weight is now `newnessScoreWeight + classificationScoreWeight + durationScoreWeight`
- `ClipSelector._calculateScore()` extended to include `usageScore` as third weighted term
- `config.recipes.classificationScoreWeight` raised from 0.25 to 0.5 — classification diversity now ~20% of recipe score
- `norm(music)` loudnorm preset: added `LRA: 11` — ffmpeg's default LRA of 4 LU is too compressed for feature/foreground music; 11 LU allows natural musical dynamics

### Fixed
- `RecipeParser.markMixLengthTrack()` was resolving `shortest`/`longest` using `track.maxLength` (recipe metadata) before clip selection — actual clip durations were unknown at that point, causing the wrong track to be marked as `mixLength=true`; `shortest`/`longest` and the default `longest` case now defer to `resolveShortestLongestTrack()` via a `_pendingMixLength` flag, with track 0 as a placeholder until resolution

---

## [2026-04-10]

### Added
- `scripts/stop.sh` — stops all services in reverse dependency order (liquidsoap → icecast → mixengine → adminserver → caddy)
- Audio List: "Plays" column between Author and Duration, right-aligned; shows `timesUsed` or an em dash for zero
- Audio View: "Plays" read-only field after Status, showing `timesUsed` or an em dash for zero
- Audio Edit: "Plays" read-only field after Status, showing `timesUsed` or an em dash for zero
- Recipe List: "Plays" and "Avg" columns between Author and Description, right-aligned; show `timesUsed`/`avgDuration` or em dash for zero/null
- Recipe View: "Plays" and "Avg Duration" read-only fields after Status
- Recipe Edit: "Plays" and "Avg Duration" read-only fields after Status (hidden on new recipe)
- `formatDuration` utility now used for `avgDuration` display in `m:ss` format
- **RecordKeeper service** (`MixEngine/core/services/recordkeeper/RecordKeeper.js`) — new post-selection bookkeeping service that computes which clips were actually heard in a mix (by walking per-track elapsed time against `mixDuration`), updates `audio.lastUsed` and `audio.timesUsed` only for heard clips, inserts a `clipUsage` row per heard clip, and returns an accurate playlist; replaces the former `RecipeParser.getPlaylistFromRecipe()` and the per-clip `_updateClipLastUsed()` in `ClipSelector`
- `clipUsage` DB table — per-row record of every clip heard in a mix (`audioID`, `recipeID`, `usedAt`); enables per-clip usage history, future digest emails, and analytics
- `timesUsed INT DEFAULT 0` column on `audio` table — cached counter incremented by RecordKeeper on each heard play; avoids a COUNT JOIN on `clipUsage` for every audio list/view request

### Changed
- Renamed legacy project name from `interference` to `driftconditions` throughout — config, scripts, setup files, service files, Caddyfiles, and DB (local and production)
- `AdminClient` heading updated from "interference" to "DriftConditions"
- ESLint config updated to match codebase style: semicolons required, brace-style and eqeqeq relaxed
- `huge` clip length category extended from 60 min max to 120 min — prevents valid long-form content (environmental recordings, radio broadcasts) from being silently excluded by the length filter
- Conductor: RecordKeeper now fires between `adjustClipTimings` and `makeMix`; `RecipeParser.getPlaylistFromRecipe()` retired; `ClipSelector._updateClipLastUsed()` removed — `lastUsed` and `timesUsed` are now set only for clips that were actually heard, not all selected clips
- RecordKeeper extended to track recipe usage: updates `recipes.lastUsed`, increments `recipes.timesUsed`, updates `recipes.avgDuration` as a weighted running average (`historyWeight=10`), and inserts a `recipeUsage` row per mix; replaces `RecipeSelector._updateRecipeLastUsed()`
- `recipeUsage` DB table and `recipes.timesUsed`/`recipes.avgDuration` columns added (local and production)
- `config.recipes.avgDurationHistoryWeight` added (default: 10)
- RecipeSelector and ClipSelector lint cleaned up; latent `subscore`-before-define bug fixed in RecipeSelector
- Conductor: error handling restructured into two separate try/catch scopes — queue-check failures wait a full `checkTime` interval before retrying; mix-pipeline failures (recipe/clip/ffmpeg errors) retry immediately with a short `retryTime` (5 s) backoff rather than waiting the full queue interval
- `AdminServer /api/audio/info`: `timesUsed` now read directly from `audio.*` column instead of a COUNT JOIN on `clipUsage`; simplifies the query and improves performance
- Audio List: Duration column right-aligned to match Plays
- Audio Edit: non-editable field rows (Filename, Author, Date, Status, Plays) converted from `mb-2` wrappers to `form-row` for consistent spacing with Audio View

### Fixed
- MixEngine: `amix` filter's default `normalize=1` was dividing each track's level by the number of tracks (~−6 dB per track), undoing per-clip `loudnorm` work and causing mixes to be too quiet; `normalize=0` is now set when any track or clip in the recipe uses a norm effect, preserving pre-normalized levels
- MixEngine: `telephone` effect's `acompressor` filter was using `level_out` (an `agate`-only option, invalid in ffmpeg 7.1.1); replaced with `makeup:0.8` which is the correct `acompressor` makeup gain parameter
- MixEngine: silence clips with invalid or unrecognized `clipLength` keys (e.g. `"small"`) no longer produce `Infinity` duration, which previously caused ffmpeg `aevalsrc` filter to fail; falls back to `short` range with a warning log
- MixEngine: unrecognized `clipLength` keys in non-silence clips now log a warning instead of silently dropping the length filter; if no valid keys match, a second warning is logged noting that no length constraint will be applied
- Long Narrative with music bed: root cause identified — malformed `length` key in recipe (`"long, huge"` as single string instead of `["long", "huge"]`) bypassed the length filter, allowing a 106-min clip to be selected; recipe has been corrected and `huge` max extended to accommodate legitimately long clips
- MixEngine: removed unused `db` import and dead `trackOutputs` variable from `MixEngine.js`; removed unused `db` import from `Conductor.js`
- Production `.env` symlinks (`AdminServer/.env`, `MixEngine/.env`, `AdminClient/.env`) were broken after directory rename — repointed to `~/driftconditions/.env`
- Production `BASEDIR` updated to `/home/debian/driftconditions` in root `.env`

---

## [2026-04-05]

### Added
- Audio List: full-text search across title, tags, and comments — supports multiple words (ANDed) and quoted phrases; search term preserved in URL and stacks with filter and sort
- Audio List: active status filter displayed as an inverted chip; active user filter shown as a dismissible chip after the filter bar
- Audio List: clicking a username in the Author column now filters to that user's clips; user filter stacks independently with status filter and search
- User List: inline Quick Edit row — Role (dropdown) and Status (dropdown); reuses `profileEdit` thunk, no server changes required
- `TODO.md` added — all known work items organized by UI/UX, MixEngine, and Backend/Infrastructure

### Fixed
- Audio List user filter now correctly sends numeric `creatorID` to backend (previously sent username string, which never matched)
- `message-box` height changed from fixed `2rem` to `min-height` so long error messages expand rather than overflow

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
