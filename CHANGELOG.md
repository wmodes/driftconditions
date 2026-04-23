# Changelog

All notable changes to this project are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

---

## [2026-04-23] (37)

### Added
- **Mix cover image and metadata (Phase 5)** — mixes now carry a cover image and ID3 tags.
  - `ClipSelector.js` — `coverImage` added to the fields propagated from the DB clip onto the recipe clip object (including the `repeat(n)` path).
  - `CoverSelector.js` (new, `MixEngine/core/services/covers/`) — walks recipe tracks/clips in order, returns the first clip's `coverImage`; falls back to a randomly chosen alt image. Silence and no-art clips are skipped naturally.
  - `Conductor.js` — instantiates `CoverSelector`; after clip selection sets `mixDetails.coverImage`, `mixDetails.coverImagePath`, and `mixDetails.mixTitle` (`"Recipe - First Clip"`).
  - `MixEngine.js` — `_embedMetadata()` runs a second ffmpeg pass (audio stream-copy, no re-encode) after the mix is built, embedding ID3 title, artist (`DriftConditions - driftconditions.org`), and APIC cover art.
  - `MixQueue.js` — `coverImage` added to the `createMixQueueEntry` INSERT.

---

## [2026-04-23] (36)

### Added
- **Cover image backfill script** (`scripts/backfill-cover-images.js`) — two-phase pipeline to populate `coverImage` for existing approved clips with no art.
  - Phase 1: extracts embedded APIC cover art from each MP3 via ffmpeg; normalizes to 500×500 JPEG; tags `image-from-embed`.
  - Phase 2: remaining clips sent to Claude Haiku in batches; Haiku identifies the source and constructs an iTunes Search API query; first result's artwork fetched, normalized, and saved; tags `image-from-haiku` (found) or `image-not-found` (not found). No API key required for iTunes.
  - Flags: `--prod`, `--phase1`, `--phase2`, `--limit N`, `--offset N`, `--threshold N`, `--dry-run`.

---

## [2026-04-23] (35)

### Added
- **Cover image infrastructure (Phase 1–3)** — groundwork for per-clip and per-mix cover art.
  - Config: `content.coverImage` block added (`dir`, `ext`, `size`, `altDir`, `altNum`) and four new `audio.internalTags` entries (`image-from-embed`, `image-from-haiku`, `image-from-user`, `image-not-found`).
  - Alt image library: 15 homepage PNGs converted to 500×500 JPEG and saved as `content/images/alt/coveralt-00.jpg` through `coveralt-14.jpg` (local and production).
  - Database: `coverImage TEXT NULL` column added to `audio` and `mixQueue` tables (local and production).

### Changed
- **Production digest** — `DIGEST_REDIRECT` commented out in production `.env`; digests and reminders now deliver to real recipients with `DIGEST_BCC` silently copying the admin.

---

## [2026-04-23] (32)

### Fixed
- **contributor-digest-reminder template** — "Recent Updates" block moved to after the upload link and profile link, just before the sign-off, so the invite-to-upload flow is no longer interrupted.

---

## [2026-04-22] (31)

### Fixed
- **Admin News sort order** — news items now display oldest-to-newest on the Admin News page, matching the order they appear in digests.

---

## [2026-04-22] (30)

### Added
- **Admin News** — admins and mods can post news items via a new "Post Updates" page under the Admin nav section. Pending items appear in contributor digests and contributor-reminder emails as a "Recent Updates" section. Items are archived on the monthly digest run.
  - Backend: `adminRoutes.js` with `POST /api/admin/news/list` and `POST /api/admin/news/create`, gated by new `adminNews` permission added to admin and mod roles. Poster's username stored in payload at create time (no join needed on read).
  - Frontend: `AdminNews.js` — queued items displayed digest-style above the compose form, with small `(date by username)` attribution. `adminSlice.js` for Redux thunks.
  - Digest: `getAdminNews()` and `clearAdminNews()` in `digestRunner.js`; `hasAdminNews` / `adminNews` vars injected into `buildDigestVars` and `buildReminderVars`; archived after monthly run.
  - Templates: "Recent Updates" block added to `contributor-digest` and `contributor-digest-reminder` (HTML and plain-text).

---

## [2026-04-22] (29)

### Fixed
- **Recipe reference button** — replaced Feather info SVG (serif "i", hard to read) with a CSS circle + plain letter "i" in the button's own font, matching the style of adjacent button text.

---

## [2026-04-22] (28)

### Fixed
- **Recipe editor resize** — editor height now persists when dragged; ResizeObserver tracks wrapper height and feeds it to AceEditor as an explicit pixel value, preventing Ace's minLines/maxLines from snapping it back.
- **Recipe reference button** — info icon enlarged from 16px to 22px and button padding tightened so the icon reads clearly at button size.

---

## [2026-04-22] (27)

### Added
- **Recipe reference page** — comprehensive static reference at `/recipe-reference.html` covering recipe structure, all classifications with descriptions, length categories, track effects, clip effects, and wave modifiers with combination examples. Opened in a floating window via a new info icon button to the left of Validate in the recipe editor.

---

## [2026-04-22] (26)

### Fixed
- **Audio analysis queue** — classification comparison on upload was case-sensitive, so clips classified as `instrumental`, `vocalmusic`, or `ambient` (lowercase, as the form sends) never matched `musicAnalysisClassifications` (mixed case). Both sides are now lowercased before comparison. Clips uploaded before this fix will need a one-time backfill.

---

## [2026-04-21] (25)

### Changed
- **Recipe templates** — revised the example recipe, new track, new clip, and new silence templates to use compact cheatsheet-style comments (uppercase section labels, one-line lists) instead of verbose multi-line prose. Field order in clip objects is now classification → tags → length → volume → effects.

---

## [2026-04-21] (24)

### Changed
- **Recipe editor syntax highlighting** — switched from a minimal custom text mode to full JSON5 syntax highlighting (keys, strings, numbers, booleans, comments). `tracks` and `clips` keywords appear bold red; other unquoted keys appear in steel blue (`#336699`). Applied to both Recipe Edit and Recipe View.

---

## [2026-04-21] (23)

### Added
- **Recipe editor smart insert** — Add Track, Insert Clip, and Insert Silence buttons now use cursor position to find the nearest appropriate insertion point rather than always appending to the end.
  - Cursor inside a track → Add Track inserts after that track; cursor before/above tracks → inserts at the start of the tracks array.
  - Cursor inside a clip → Insert Clip/Silence inserts after that clip; cursor in the track header (before the clips array) → inserts at the start of clips; cursor in the clips array → inserts after the next clip.
  - Trailing comma automatically added when inserting a sibling element after a `}` that lacks one (JSON5 allows trailing commas).
  - Implementation is text-based (line splicing) so comments and formatting are fully preserved.

---

## [2026-04-21] (22)

### Changed
- **README** — full overhaul: updated architecture diagram, added sections for authentication, email/digest system, audio analysis pipeline, user roles, accurate effects reference, and current technology stack.

---

## [2026-04-21] (21)

### Added
- **Recipe search** — recipe list now has a search box filtering across title, description, classification, tags, comments, and recipe data. Token-based AND logic, quoted phrases supported.
- **Recipe filter chips** — status filter buttons now highlight the active selection.
- **Recipe user filter** — clicking a creator or editor username filters the list to their recipes, shown as a dismissible chip. Fixes broken user filter (was passing username string where backend expected numeric ID).

---

## [2026-04-21] (20)

### Changed
- **User search** — expanded to also search location and bio fields.

---

## [2026-04-21] (19)

### Added
- **User search** — user list now has a search box that filters across username, firstname, lastname, email, and notes. Stackable with the role filter. Mirrors the audio list search pattern (token-based AND logic, quoted phrases).
- **User filter chips** — role filter buttons now highlight the active selection. Fixed broken "User" filter button (missing `case 'user'` in switch).
- **User notes field** — new `notes TEXT` column on the `users` table. Visible and editable for admins/mods (gated by `userList` permission) in the user list, user list quick-edit, profile view, and profile edit page. Notes are also included in user search.

### Fixed
- **Profile Edit button** — always linked to `/profile/edit` (the logged-in user's own profile) regardless of whose profile was being viewed. Now links to `/profile/edit/:username` so admins editing another user's profile land on the correct page.

---

## [2026-04-21] (18)

### Fixed
- **Spurious digest events** — `audioRoutes:/update` was writing `audio_approved`/`audio_disapproved` events to `userComms` whenever the saved status equalled 'Approved' or 'Disapproved', even if the status hadn't changed. Now only writes when status actually transitions to those values.
- **Duplicate clips in digest** — digest runner now walks events newest-first and skips any audioID already resolved, so each clip appears at most once. Also resolves approve→disapprove conflicts naturally: the most recent event wins.
- **Email logotype** — replaced Google Fonts text header (rendered only for users with the font installed) with a hosted PNG logotype served from `siteUrl/img/logotype/`.

### Fixed (audio analysis)
- **`audio-decode` ESM incompatibility on Node 18** — pinned to `3.0.0` and switched `require()` to dynamic `import()`. Node 23 silently supports `require()` of ES modules; Node 18 does not.

---

## [2026-04-20] (17)

### Added
- **`internalTags` field** — new JSON column on the `audio` table for admin/mod-only processing flags, invisible to contributors. Gated by new `specialTags` permission (admin + mod). Visible and editable in AudioView and AudioEdit.
- **Essentia audio analysis experiment** — `experiments/essentia/analyze.js` analyzes an audio file and outputs BPM, key, and danceability tags (e.g. `102-bpm`, `g-minor-key`, `danceable`) with confidence thresholds. Analyzes the middle 180s of each file. BPM > 120 also emits a halved tag to catch double-time detection.
- **Audio analysis pipeline** — nightly runner (`AdminServer/utils/audioAnalysisRunner.js`) processes clips tagged with `needs-audio-analysis` internal tag, merges Essentia results into visible tags, then swaps the queue tag for `audio-analyzed`. Fired by `audio-analysis.service` / `audio-analysis.timer` at 08:00 UTC (3 AM Eastern).
- **Auto-queue on upload** — audio upload route sets `needs-audio-analysis` on new clips classified as Instrumental, VocalMusic, or Ambient.
- **Config** — `audio.internalTags.{analysisQueue, analyzed}`, `audio.musicAnalysisClassifications`, and `audioAnalysis.runTimeUTC` added to shared config.

---

## [2026-04-20] (16)

### Fixed
- **ClipSelector tag scoring bug** — clips with no tags were returning a tag score of 1.0 (maximum) instead of 0. This caused untagged clips to score as perfect contextual matches regardless of recent playlist context, and actively dominated over tagged clips at session start when `recentTags` is empty. Fix: return 0 for tagless clips so they neither help nor benefit from contextual tag matching.

---

## [2026-04-19] (15)

### Changed
- **Tag examples** updated in audio add/edit tooltip and contributor tips email — replaced generic examples with more evocative and musically specific ones: *thunderstorm*, *lo fi*, *haunting*, *E#m key*, *100 bpm*.

---

## [2026-04-16] (14)

### Added
- **Recently Played Audio** section on profile stats — shows the 3 most recently played clips (by `lastUsed`) for the user. Links to audio detail view for users with `audioView` permission. Section is hidden when no clips have been played.

---

## [2026-04-16] (13)

### Fixed
- **Liquidsoap fallback to shortwave static when MixEngine is down** — two bugs prevented the fallback from working:
  - `liquidsoap.service` used `Requires=mixengine.service` (hard dependency), causing systemd to kill Liquidsoap the instant MixEngine stopped. Changed to `Wants=` (soft dependency) so Liquidsoap stays up independently.
  - `fetch_next_track()` always returned a `request.create(...)` call, even on curl failure (empty string). `request.dynamic` retried indefinitely rather than becoming unavailable, so `fallback()` never triggered. Fixed by returning `null()` on empty result, which marks the source unavailable and switches fallback to static.
  - Result: when MixEngine goes down, Liquidsoap plays out the current mix, then crossfades smoothly into looping shortwave static. When MixEngine recovers, it crossfades back seamlessly.

---

## [2026-04-15] (12)

### Fixed
- **Auth redirect for unauthenticated users** — visiting a protected URL while not logged in now redirects to `/signin?next=<url>` instead of crashing or showing the page blank. After login, the user is forwarded to the originally requested URL.
  - `authUtils.js` — fixed `result.data?.error` path (was `result.error`, always undefined); added `?next=` param to redirect; distinguished unauthenticated (`not_authorized` + no `userID`) from unauthorized (`not_authorized` + `userID` present) — former goes to `/signin`, latter to `/notauth`.
  - `Signin.js` — after successful login, reads `?next=` query param and navigates to it before falling back to profile redirect.
  - `authSlice.js` — `initialState.user` changed to `{ permissions: [] }` to prevent "Cannot read properties of undefined (reading 'permissions')" crash on cold page load before auth check completes.
  - `RootLayout.js` — added second render guard (`!isPublicPage && !user?.userID`) to hold render until redirect fires, preventing flash of protected content.
  - `AudioView.js` — added `useAuthCheckAndNavigate('audioView')` and guarded `permissions` access with null check.

---

## [2026-04-15] (11)

### Added
- **`hasSentToday(userID, commType)`** — hard safety gate in `digestRunner.js` using `createdAt >= CURDATE()`. Checked at the top of each per-user loop before any other logic; prevents double-sends regardless of schedule, missed-send, or other conditions.
- **`hasNewEvents(userID)`** — checks `userComms` for unsent `audio_approved` / `audio_disapproved` events for a user. Used by daily-digest `isScheduledToday`.

### Changed
- **Daily digest now event-driven with monthly fallback** — `isScheduledToday` for the daily schedule is now `async (user) => await hasNewEvents(user.userID) || isNthWeekdayOfMonth()`. Fires when there are new events to report OR on the configured day of the month; stays silent otherwise. Prevents empty daily emails for mods/admins with no recent activity.
- **Role-based digest frequency defaults updated** — `mod` and `admin` default to `'daily'` (was `'weekly'`). Full table: `user → yearly`, `contributor → monthly`, `editor → weekly`, `mod → daily`, `admin → daily`.
- **`user-reminder` schedule `windowDays` set to `null`** — removes missed-send fallback window that was triggering a blast to all users on first run (since none had a prior sentinel). Anniversary window alone is sufficient gating.
- **ProfileEdit digest frequency dropdown** — added `Yearly` option; default display value set to `'yearly'` if `digestFrequency` is unset.

### DB migrations required
```sql
-- Update mod and admin digest defaults to daily
UPDATE users SET digestFrequency = 'daily' WHERE roleName IN ('mod', 'admin') AND digestFrequency = 'weekly';
```

---

## [2026-04-14] (10)

### Added
- **`setupfiles/digest.service`** — systemd oneshot service that runs `scripts/run-digest.js` as `debian` user from `AdminServer/` working directory.
- **`setupfiles/digest.timer`** — systemd timer that fires `digest.service` daily at 14:00 UTC (9 AM Eastern). `Persistent=true` catches any runs missed during server downtime. Link both into `/etc/systemd/system/` and enable with `systemctl enable --now digest.timer`.

---

## [2026-04-14] (9)

### Added
- **`user-reminder` template** — yearly anniversary nudge for users who haven't become contributors. Wes voice; brief evocation of the station, repeat of the contributor ask, mailto link pre-populated with subject. Signed `— Wes`.
- **`user-reminder` schedule entry** wired into digest runner — fires on signup anniversary (±`anniversaryWindowDays`), gated by `hasGottenLastDigest(350)`. `isAnniversaryWindow()`, `getUsersForYearlyNudge()`, `buildUserReminderVars()` all live in `digestRunner.js`.

---

## [2026-04-14] (8)

### Added
- **`contributor-digest-reminder` template** — sent monthly to contributors who have never submitted audio. Friendly nudge in Wes's voice; links to upload page with a note that the user must be logged in first. Footer has separate "Manage digest preferences" and "Unsubscribe" links.
- **`config.digest` section** — `weeklyDay` (0–6), `monthlyWeek` (nth occurrence), `anniversaryWindowDays`. Controls cadence without touching code.

### Changed
- **`digestRunner.js` fully rewritten** — schedule-table architecture replaces ad-hoc logic. Each entry defines cadence, recipient query, var builder, commType sentinel, and missed-send window. Main loop is ~20 lines with no per-schedule special cases.
  - Five schedules: daily digest, weekly digest, monthly digest, monthly contributor reminder, yearly user reminder (commented out pending `user-reminder` template).
  - Recipient queries: `getContributorsWithSubmissions(freq)` — any role with audio submissions; `getContributorsWithNoSubmissions()` — contributor role, no submissions ever.
  - Missed-send fallback: `hasGottenLastDigest(userID, commType, windowDays)` checks `userComms` for a sentinel row within the window. If absent, send fires regardless of day. Prevents gaps when server was down on a scheduled send day.
  - `logSent(userID, commType)` inserts a sentinel row after each send, gating the missed-send check.
  - All functions fully JSDoc'd.
- **Digest footer updated** — both `contributor-digest` templates now have separate "Manage digest preferences" (profile edit link) and "Unsubscribe" (JWT link) in footer. `digestPrefsUrl` added to vars.
- **`mailer.js` JSDoc'd** — file header converted to `@file` block; `createTransporter` documented.
- **`TODO.md`** — noted that direct navigation to protected URLs (e.g. `/audio/upload`) without a session causes an error; affects digest reminder email links.

---

## [2026-04-14] (7)

### Added
- **Contributor digest email system** — `AdminServer/utils/digestRunner.js` groups pending `userComms` events by user, fetches per-user stats (audio contributed, pending, top plays, recent pending, recipes), renders Handlebars templates, sends via `sendTemplate()`, and marks rows `sentAt = NOW()`. Handles both approved and disapproved events. `scripts/run-digest.js` is the entry point (must be run from `AdminServer/` or via `cd AdminServer && node ../scripts/run-digest.js`).
- **Contributor digest templates** — `AdminServer/templates/email/contributor-digest/` — HTML and plain text versions. Sections: disapprovals (with editor notes in blockquote), approvals, stats (member since, last contributed, total plays, audio counts, recipes if any, top plays, waiting for approval). Signed JWT unsubscribe link in footer.
- **Unsubscribe route** — `GET /api/user/unsubscribe?token=...` verifies signed JWT (purpose: `unsubscribe`), sets `digestFrequency = 'nodigest'`, returns HTML confirmation page.
- **Digest frequency selector on ProfileEdit** — dropdown (Daily / Weekly / Monthly / None) with explanatory note. Exposed via `digestFrequency` in `getAllowedFields` for both `extended` and `self` cases.
- **Role-based digest frequency defaults** — new users get `digestFrequency = 'yearly'` at signup (both regular and OAuth). On role change, digest frequency auto-updates to the new role's default (`contributor → 'monthly'`, `editor/mod/admin → 'weekly'`) but only if the user hasn't customized it (i.e. it still matches the previous role's default).

### Changed
- **Moderation notes only sent on disapproval** — `audioRoutes.js` now passes `notes: ''` for approved clips; disapproved clips include `record.comments` as notes. Prevents track metadata comments (e.g. "from freemusicarchive.org") from appearing as editor feedback in approval emails.
- **`userComms` queues both approved and disapproved events** — previously only `audio_approved` was queued; `audio_disapproved` now also queued with notes in payload.
- **Digest frequency values updated** — values are now `nodigest`, `daily`, `weekly`, `monthly`, `yearly` (was `nodigest`, `daily`, `weekly`, `monthly`). `nodigest` routes to immediate individual email; others batch to digest.

### DB migrations required
```sql
-- Migrate existing users to role-based digest defaults (run on local and prod)
UPDATE users SET digestFrequency = 'yearly'  WHERE roleName = 'user'                    AND digestFrequency = 'daily';
UPDATE users SET digestFrequency = 'monthly' WHERE roleName = 'contributor'             AND digestFrequency = 'daily';
UPDATE users SET digestFrequency = 'weekly'  WHERE roleName IN ('editor','mod','admin') AND digestFrequency = 'daily';
-- Also update the column default
ALTER TABLE users MODIFY COLUMN digestFrequency VARCHAR(16) DEFAULT 'yearly';
```

---

## [2026-04-14] (6)

### Added
- **Contributor digest scaffolding** — `userComms` table created (commID, userID, commType, payload JSON, createdAt, sentAt). `digestFrequency VARCHAR(16) DEFAULT 'weekly'` added to `users` table (values: `weekly`, `monthly`, `none`).
- **Digest event queuing** — `audioRoutes.js /audio/update` now inserts an `audio_approved` event into `userComms` whenever a clip is approved, independent of the notify checkbox. Basis for future periodic digest emails.

### Changed
- **Audio moderation notifications overhauled** — "Notify contributor" checkbox moved inline with Status on both AudioEdit and AudioList quick edit. Checkbox defaults to checked but is grayed out (label color `#999`, input disabled) until status is changed to Approved or Disapproved, matching the "Notify user" pattern on UserList.
- **Moderation notes field removed** — separate `moderationNotes` textarea removed from AudioEdit. Notes to include in the notification email now go in the regular Comments field, which is saved to the DB and passed to the email template. Instructional note ("Approval/Disapproval notes go in comments below, sent to contributor") shown below the Status row.
- **`audioRoutes.js`** — moderation email now uses `record.comments` for the notes field (was `record.moderationNotes`).
- **AudioList quick edit layout** — Classification and Tags moved to their own row below Status/Notify, making room for the notify checkbox and note on the status row.

---

## [2026-04-14] (5)

### Added
- **react-helmet-async** — `<Helmet>` in `RootLayout.js` sets page title, meta description, and OG/Twitter social card tags at runtime from `brand.js`. `HelmetProvider` wraps the app in `index.js`.

### Changed
- **`index.html` stripped to minimal shell** — hardcoded title, description, and all OG/Twitter meta tags removed; comment left explaining they're set at runtime by Helmet. Do not add brand values here.

---

## [2026-04-14] (4)

### Changed
- **Tailwind `cornflower` color removed** (`tailwind.config.js`) — was unused in JS; brand colors are fully owned by `brand.css` via CSS variables. Stale `/* bg-cornflower */` comments cleaned from `index.css`.

### Removed
- `AdminClient/src/App.js`, `App.test.js`, `index-broken.js` — dead code, never imported by the running app.

---

## [2026-04-14] (3)

### Added
- **Email template system** (`AdminServer/utils/mailer.js`, `AdminServer/templates/email/`) — Handlebars-based email templates with shared layout (`layout.html`/`layout.txt`) and partials. `sendTemplate()` helper compiles inner template, wraps in layout, and calls `sendMail()`. Brand globals (`siteName`, `siteUrl`) injected automatically.
- **Email templates** — welcome (auto on signup, from `wes@`), password-reset (extracted from inline HTML), role-change-contributor (with tips), role-change-editor, role-change-mod, audio-moderation (approved/rejected with optional notes), contributor-digest (stub).
- **Contributor tips partial** — `partials/contributor-tips-html.html` and `contributor-tips-txt.txt`; used in contributor promotion and as P.S. in editor/mod emails.
- **Welcome email** — sent automatically on signup; written in Wes's voice; includes mailto link pre-populated with subject `{{username}} wants to be a contributor to DriftConditions`.
- **Role-change notifications** — `userRoutes.js /profile/edit` sends appropriate role-change template when `roleName` changes and `notifyUser` is true. UI: "Notify user" checkbox (default checked, grayed out until role changes) on User List quick edit and ProfileEdit, placed inline with the Role field.
- **Audio moderation notifications** — `audioRoutes.js /audio/update` sends `audio-moderation` template when status changes to Approved/Disapproved and `notifyContributor` is true. UI: "Notify contributor" checkbox (default checked) and notes textarea shown conditionally on AudioEdit when status is Approved or Disapproved.

### Fixed
- Plain text email templates now compiled with `noEscape: true` to prevent Handlebars HTML-encoding apostrophes (e.g. `didn&#x27;t` → `didn't`).

---

## [2026-04-14] (2)

### Added
- **Brand abstraction layer** — `config/brand.js` is now the single source of truth for site identity (name, tagline, descriptions, site URL, OG image, email addresses). Symlinked into `AdminClient/src/brand/brand.js` for frontend access within CRA's `src/` boundary.
- **`brand.css`** (`AdminClient/src/brand/brand.css`) — CSS-specific brand values (colors, nav, links, avatars) extracted from `index.css` into their own file. Imported before `index.css` so brand identity is clearly separated from layout/UI variables.
- **`mailer.js` brand-driven FROM addresses** — hardcoded `FROM_ADDRESS` replaced with `FROM.noreply`, `FROM.welcome`, and `FROM.contact`, all sourced from `brand.js`. Callers may pass `from` to `sendMail()`; defaults to `FROM.noreply`.

---

## [2026-04-14]

### Fixed
- **Norm preset levels calibrated to broadcast standards** (`MixEngine.js`) — previous `dynaudnorm` peak targets were too high for background material. Adjusted to broadcast-standard dBFS peaks: `voice`/`spoken` and `music` → -3dBFS (`p=0.708`); `bed`/`musicbed` → -12dBFS (`p=0.251`). Default unchanged. Fixes bed tracks sounding too loud relative to foreground narrative in Drony Story and similar recipes.

---

## [2026-04-13] (4)

### Fixed
- **Drony Story "Conversion failed" at 6:49** (`MixEngine.js`) — FFmpeg's `loudnorm` (EBU R128) has a fixed 4096-block internal buffer that fails with EINVAL on looped stereo streams beyond ~409s. Replaced `loudnorm` with `dynaudnorm` (dynamic audio normalizer) throughout `_normEffect` — streaming-safe, frame-by-frame, no duration limit. All presets (voice, music, bed, default) retained with equivalent `dynaudnorm` parameters (`p`/`m`/`f`/`g`); `g=301` (max Gaussian window) approximates `loudnorm`'s whole-file analysis. The previous fix targeted only the `bed` preset, which was inelegant; `loudnorm` + `aloop` is problematic for any norm preset on any looped track.

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
