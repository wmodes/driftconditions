# Changelog

All notable changes to this project are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

---

## [2026-05-15]

### Fixed
- **RecipeSelector: new/never-used recipes scored too low to be selected** — `_sortRecipesRecentToEarliest` placed recipes with `lastUsed = null` at the top of the list (treating them as most recently used). This list is used to build `recentClassifications`, where index 0 = most recently heard. So never-used recipes' classifications landed at index 0 and received a near-zero classification score, consistently knocking them out of the selection pool. Fix: null `lastUsed` now sorts to the bottom (oldest/never-used), so their classifications score high and new recipes compete fairly.

### Added
- **Recipe preview** — editors can generate an off-the-record mix from a recipe without saving. Preview button appears in the RecipeEdit toolbar next to Insert Silence. Clicking it opens a modal (warn → spinner → audio player with scrubbing). The mix is rendered by MixEngine via a stripped pipeline (RecipeParser → ClipSelector → ClipAdjustor → MixEngine) that skips RecordKeeper and MixQueue entirely — no queue entries, no clip usage records. Output goes to `content/mixpreview/`. If a randomly selected clip file is not present locally, the modal shows a clear message and offers to regenerate (which will pick different clips). Regenerate button available after a preview is ready.

---

## [2026-05-14]

### Fixed
- **FullscreenPlayer cover image and track list stale after mix change** — `Playlist` component (which polls the queue every 60s) is only mounted on the homepage, so navigating to `/fullscreen` stopped all queue updates. `FullscreenPlayer` now polls `fetchQueuePlaylist` every 60 seconds independently, keeping the cover image and clip list in sync with the current mix.

---

## [2026-05-13]

### Added
- **Audio transcode pipeline for large/high-bitrate files** — large files (>10MB and >192kbps) are now transcoded to 192kbps MP3 for efficient transmission to listeners. MixEngine is unaffected — it continues to read full-resolution source files for mixing.
  - `xcodeUtils.js`: `needsTranscode()` (ffprobe size+bitrate check) and `transcodeFile()` (ffmpeg 192kbps libmp3lame, updates `audio.filename` in DB). Transcoded files written alongside originals as `-xcode.mp3`.
  - Detection runs at upload time so new files are classified immediately; actual transcoding is deferred to the nightly runner.
  - `xcodeRunner.js`: two-pass backfill runner — detection pass classifies untagged records, transcode pass processes `xcode-needed` records. Safe to interrupt and re-run; skips already-tagged records.
  - `run-xcode-backfill.js`: job entry point for the runner.
  - `setupfiles/xcode.service` + `setupfiles/xcode.timer`: systemd oneshot service + nightly timer (10:00 UTC); symlinked into `/etc/systemd/system/` at deploy time. `Persistent=true` catches up on missed runs.
  - Tag convention: `xcode-needed`, `xcode-not-needed`, `xcode-completed`, `xcode-error`, `xcode-192` stored in `internalTags`.

---

## [2026-05-10]

### Fixed
- **AudioEdit: cover image drop zone not updated** — same drop zone improvements applied to AudioUpload/AudioBatchUpload were missing from AudioEdit. Drop handlers moved from the "Choose Image" button label to the entire cover-image-panel div; `onDragOver` added to both `<img>` elements so dropping on an existing preview works correctly.
- **AudioUpload/AudioBatchUpload: dropping image on existing cover preview had no effect** — `<img>` element's native drag behavior intercepted dragover before it could bubble to the panel's drop handler. Added `onDragOver={e.preventDefault()}` directly on the img element.
- **AudioUpload/AudioBatchUpload: filename-to-title conversion improved** — commas, slashes, and parentheses now preserved (previously stripped); title case applied only when the original filename is all-uppercase (previously always applied). `generateTitle` extracted from both pages into `formatUtils` to eliminate duplication.
- **AudioUpload/AudioBatchUpload: file drag-and-drop broken when form fields populated** — browser's native file-input drop handling was intercepted by ReactTags drag listeners when tag pills were present. Added explicit `onDragOver`/`onDrop` wrapper around the audio file input with `DataTransfer` injection so the native input correctly shows the dropped filename. Batch upload handles multiple dropped files. Both pages updated.
- **AudioUpload/AudioBatchUpload: cover image droppable on full panel** — drop zone extended from "Choose Image" button only to the entire cover image panel (preview image + placeholder + button).
- **AudioUpload: console spam from `formatUtils.setClassificationFormOptions`** — `console.log` at line 141 fired on every render; commented out.
- **AudioUpload: file drag-and-drop blocked when tags already present** — `ReactTags` registers drag handlers on tag pills for reordering, which intercepted `dragover`/`drop` events before they could reach the `<input type="file">`. Fixed by adding `allowDragDrop={false}` to the `ReactTags` component.
- **AudioUpload: tags cleared after server error** — two compounding bugs: (1) `initialRecord` was passed to `TagInput` but the component reads `initialTags`, so it always initialized empty; (2) the `<Waiting>` early-return during loading unmounts `TagInput`, which remounts on error and re-initializes from the (wrong) prop. Fixed by correcting the prop name to `initialTags` so the preserved parent `record.tags` state is correctly restored on remount.
- **AudioUpload: noisy console.log on every tag addition** — two debug `console.log` calls in `TagInput.handleAddition` fired on every tag add; commented out.
- **FullscreenPlayer pill bar clipped on mobile** — pill bar `width: 60%` was too narrow to fit heart + minimize + active sleep timer on small screens. Added `min-width: fit-content` and horizontal padding so the pill expands to its content width when needed.
- **`ClipSelector._getEarliestAndLatestDates()` collapsed dateRange when all clips used recently** — same bug as RecipeSelector: `earliest` was initialized to `new Date().getTime()` (now), so when all clips in the pool had recent timestamps, none would beat the initial value and `dateRange` collapsed to ~0. Caused `_calculateNewnessScore()` to assign 1.0 to every clip, erasing recency distinction. Fixed by initializing `earliest` to `Infinity` with `isFinite` guards on assignment.
- **`ClipAdjustor._adjustFlexibleClips()` degenerate silence scaling when `lastTotal === 0`** — the rejection-sampling fallback scaled durations by `budget / lastTotal`. If all flexible (silence) clips had `minLength === maxLength === 0`, `lastTotal` was 0, `scale` was set to 0, and every clip got duration 0 — producing a silent track with no spacing. Fixed to detect the zero-total case and assign each clip its `minLength` instead of scaling.
- **`_getEarliestAndLatestDates()` collapsed dateRange when all recipes used recently** — `earliest` was initialized to `new Date().getTime()` (now), so if all recipes had been used within a short window, none of their timestamps would beat the initial value and `dateRange` would collapse to ~0. This caused `_calculateNewnessScore()` to assign 1.0 to every recipe, erasing all recency distinction. Fixed by initializing `earliest` to `Infinity` so any real timestamp is guaranteed smaller. Added guard for the all-null edge case where `earliest` stays `Infinity`.
- **`_calculateClassificationSubscore()` division by zero with one classification in history** — when `recentClassifications.length === 1`, the normalization formula `index / (length - 1)` divides by zero, producing `NaN` that silently corrupts the weighted score. Fixed with an explicit guard: a single-entry history means the classification is the most (and only) recent one heard, so it scores 0.
- **Recipe `usageScoreWeight` miscalibrated** — weight was set to 5 (intended as "5 out of 100") but the scoring system operates on a 0–1 scale, making usage 10× stronger than newness and causing recently-played recipes to remain in the selection pool. Corrected to 0.1, restoring newness and classification scores as the dominant diversity signals.

---

## [2026-05-06]

### Fixed
- **Tab takeover always flushes stale buffer** — when a playing tab closes and transfers to another tab, the receiving tab now always reloads the stream src before playing. Previously `stoppedAtRef` was never set on transfer, so the stale check evaluated false and the tab resumed from a potentially hours-old buffer. Fix: set `stoppedAtRef.current = 0` on transfer receipt, guaranteeing the flush path in `playStream()`.

---

## [2026-05-06]

### Changed
- **Silence overrun instead of crush** — when fixed clip content exceeds the mix budget, silence spacers now take their declared minimum length and let the track overrun (getting cut by the final trim filter) rather than scaling silences to near-zero. Preserves recipe spacing intent when long clips are selected. Previous proportional-scaling behavior is preserved in commented code for easy revert.

---

## [2026-05-06]

### Fixed
- **Auto-exclude looping tracks from mix-length resolution** — `resolveShortestLongestTrack()` in `RecipeParser` now filters out looping tracks before picking the longest/shortest duration driver. A track with `loop` in its effects (at track level or on any clip) is a bed designed to fill the mix, not define it. Previously, a looping bed with a long source file could "win" as the longest track, causing ClipAdjustor to use the bed's raw file duration as `mixDuration` and crush silences on the structured track to near-zero. Recipes with looping beds and a structured track now work correctly without requiring an explicit `trim` effect on the structured track. If all tracks loop (a degenerate recipe), falls back to the previous behavior and logs a warning.

---

## [2026-05-04]

### Added
- **Heart a mix** — listeners can heart/unheart the currently playing mix without authentication. Heart state persists in localStorage (`dc_hearts`) with a 48-hour TTL, pruned on each heart action. Mixes with 2+ favorites are exempt from the regular queue pruning job. Heart icon appears in the playlist (between time and title) and in the fullscreen pillbar (before minimize). IP-based rate limiting on the endpoint (1 action per mix per minute).
- **`favorites` column on `mixQueue`** — new `INT NOT NULL DEFAULT 0` field; incremented/decremented by the heart endpoint; used as a pruning guard in `MixQueue.pruneMixes()`.

---

## [2026-05-04]

### Changed
- **Sleep timer values moved to config** — `fadeSeconds` (30) and `options` ([15, 30, 60] min) now live in `config.sleepTimer` rather than hardcoded in `AudioPlayer` and `SleepTimerButton`.

---

## [2026-05-03]

### Added
- **Fullscreen player** — new `/fullscreen` route renders a full-viewport dark overlay with cover art, clip list, play/pause button, and a minimize+sleep pill bar. On mobile, layout collapses to single column with the cover above the track list. Cover image falls back to a random alt image (same as homepage hero) if the mix cover is missing or broken.
- **Sleep timer** — moon icon in both the bar player and fullscreen opens a dropdown (1 min test / 15 / 30 / 60 min). Active timer shows an amber countdown next to the moon. Audio fades out over the last 30 seconds, then stops and broadcasts the stop intent to all tabs. Setting the timer auto-starts playback if nothing is playing.
- **Bar player actions** — fullscreen (maximize) and sleep (moon) icons added to the right of the faux player bar, grouped in a `.player-actions` flex row at 75% page width. Icons share the same hover/color rules as the fullscreen pill bar.

### Fixed
- **Cover image URL resolution** — `resolveCoverImageURL` now prepends `staticBaseURL` only; the `coverImage` DB field already contains the full relative path and extension (e.g. `img/covers/1674.jpg`). Previous code was double-pathing and omitting the extension.
- **Static assets in local dev** — `REACT_APP_STATIC_URL` in dev `.env` updated to `https://driftconditions.org` so cover images and alt images load from production during local development.

---

## [2026-04-30]

### Added
- **Expanded key tagging in audio analysis** — Essentia key detection now produces three tags instead of one: `{note}-{scale}-tonic` (specific, e.g. `a-minor-tonic`), `{note}-{scale}-key` (key family, e.g. `a-minor-key`), and the relative major/minor cross-tag (e.g. `c-major-key` on an A minor clip). A full 24-key relative lookup table covers all major/minor pairs. This allows clipSelector to naturally prefer same-key matches while still occasionally pairing relative-key clips — harmonic affinity baked into tag overlap math. Root-key tag was prototyped and dropped: it caused harmonic mismatches by grouping parallel keys (e.g. A-flat major and A minor) that sound a half step off.
- **647 prod clips requeued for re-analysis** — all clips previously tagged `audio-analyzed` swapped back to `needs-audio-analysis` so the nightly runner backfills the new tonic and relative key tags.

### Changed
- **`audioAnalyze.js` moved from `experiments/essentia/` to `AdminServer/utils/`** — the Essentia analysis subprocess is now load-bearing infrastructure, not an experiment. `experiments/essentia/analyze.js` kept in sync but is no longer the authoritative copy.
- **`essentia.js` and `audio-decode` added to AdminServer dependencies** — previously only installed under `experiments/essentia/node_modules/`; now properly installed in `AdminServer` so the production job can run without depending on the experiments directory.
- **`audioAnalysisRunner.js` spawn path updated** — now references `../utils/audioAnalyze.js` instead of the experiments directory.
- **`audio-audit.js` / `audio-audit-apply.js` renamed** — to `scripts/llm-tag-suggest.js` / `scripts/llm-tag-apply.js` to distinguish LLM-assisted semantic tagging from Essentia acoustic analysis. Output file renamed from `audio-audit-results.json` to `llm-tag-results.json`.

### Fixed
- **Homepage "Curious how it works?" layout** — gear icon now sits left of two stacked lines ("Curious how it works?" / "You're our kinda people.") using a `.icon-callout` flexbox wrapper with `align-items: center`. Previously the icon and text were inline on a single line.

### Content
- **Junto 0747 clips approved** — all 30 Disquiet Junto 0747 clips set to `Approved` status, making them available for mix selection.

---

## [2026-04-29]

### Fixed
- **Multiline text fields losing line breaks in view pages** — added `.multiline { white-space: pre-wrap }` CSS class to `index.css` and applied it to `comments` and `description` in `AudioView`/`RecipeView`, and `bio`/`notes` in `Profile`. Also defined `.form-value` as a proper CSS class (previously unstyled).
- **Audio file 404 crashing AudioView and AudioEdit** — `initWaveSurfer` promise rejection was unhandled, causing a full-page runtime error. Added `.catch()` in both pages; missing audio now shows a muted inline message (`.media-unavailable`) instead of crashing. Backend `/sample` route 404 log level downgraded from `error` to `warn`.
- **Broken cover images showing as broken `<img>` in AudioView and AudioEdit** — added `onError` handler on cover `<img>` elements; failed loads now fall back to the existing `cover-image-placeholder` style showing "Image not found".
- **Hero image and cover images broken in local dev** — relative image paths (`/img/covers`, `/img/alt`) weren't served by the React dev server. Added `REACT_APP_STATIC_URL` env var; dev `.env` sets it to `https://localhost:3000` (Caddy), prod leaves it unset so paths remain relative. Wired into `config.js` as `staticBaseURL`.

### Added
- **Moderation queue count on profile** — users with `audioEdit` permission now see "Waiting for moderation: n" at the bottom of the stats column on their profile page. Backend adds a system-wide `pendingAll` count to `getProfileStats` gated on the `audioEdit` permission; frontend checks `canAudioEdit` and renders the stat row conditionally.
- **Moderation queue count in digest emails** — contributors with `audioEdit` permission (editor/mod/admin) now receive a pending clip count with a link to `/audio/list` at the bottom of their digest email. Permission checked via two-query roles lookup in `buildDigestVars`; `hasPendingAll`/`pendingAll` vars added to both HTML and plain-text templates.

### Changed
- **`HowItWorks.js` fully rewritten** — restructured, expanded, and rewritten for an audience of writers and academics interested in net art, procedural generation, and experimental audio. New section order: The Accident → Organized Chaos → The Lineage → The Drift → The Contributors → The Recipes → The MixEngine → closing. New sections: The Lineage (Dada, cut-up tradition, Cage) and a closing coda. All sections revised for stronger lyrical takeaways and conceptual depth. Authorship indeterminacy, the dérive, ephemerality, and the participatory framework made explicit. Removed the contributor call-to-action (now on the homepage).
- **`HowItWorks.js` image updates** — new and repositioned figures throughout; images now appear after the section they illustrate. Added: vintage shortwave radio dial (The Accident), John Cage at the National Foundation for the Arts 1966 (The Lineage). Improved alt text on all images.
- **ClipAdjustor silence budget log level** — downgraded "Min silences exceed budget" from `warn` to `info`; this is expected graceful degradation, not an error condition.

### Added
- **Player Upgrade Plan section 3.4** — "Stale Buffer on Resume" added to `design/DriftConditions Spring 2026 Player Upgrade Plan.md`. Covers the stale `<audio>` buffer problem on long pauses, implementation via `stoppedAt` timestamp and src reload threshold, BroadcastChannel interaction, and mobile behavior.

---

## [2026-04-27] (577)

### Fixed
- **Telephone effect crashing mix generation** — `acompressor` filter in `_telephoneEffect()` was passing `makeup: 0.8`, which is below the valid minimum of 1 (dB). ffmpeg rejected the filter args, failing the mix and falling back to the next recipe several times per day. Removed `makeup` entirely; the telephone character comes from the bandpass + heavy compression, not from makeup gain.

### Changed
- **Effect classification description updated** — removed "short" requirement; broadened examples to include radio signals and noise, reflecting actual usage (e.g. Irdial numbers stations recordings). Updated in `AdminClient/src/config/config.js` (InfoButton tooltip) and `AdminClient/public/recipe-reference.html`.

---

## [2026-04-26] (574)

### Added
- **`AdminServer/jobs/` directory** — new home for load-bearing scheduled jobs that were previously living in `scripts/`. Distinction: `scripts/` is for one-time tools; `jobs/` is for recurring infrastructure.
- **`run-cover-backfill.js` scheduled job** — all backfill logic extracted from `scripts/backfill-cover-images.js` into `AdminServer/jobs/run-cover-backfill.js`. Exports `run(argv)` using the library/executable split pattern (`require.main === module` guard), so it can be invoked directly or required by other scripts. `fetchAndNormalize` now logs the specific failure reason (HTTP status, ffmpeg error, or network error) instead of a bare "failed" message.
- **`cover-backfill.service` / `cover-backfill.timer`** — systemd oneshot service running `--untagged-only --prod` weekly on Sundays at 09:30 UTC (new clips only).
- **`cover-backfill-retry.service` / `cover-backfill-retry.timer`** — systemd oneshot service running `--retry-not-found --prod` monthly on the 1st at 21:00 UTC (re-attempt previously failed clips). Scheduled 11.5 hours after the weekly run to prevent overlap even when the 1st falls on a Sunday.

### Changed
- **`run-digest.js` and `run-audio-analysis.js` moved to `AdminServer/jobs/`** — updated require paths and comments; `setupfiles/digest.service` and `setupfiles/audio-analysis.service` ExecStart paths updated accordingly.
- **`scripts/backfill-cover-images.js` gutted to shim** — now a thin wrapper that requires `AdminServer/jobs/run-cover-backfill.js` and forwards all CLI flags. Any fixes to the job apply to both automatically.

### Fixed
- **`Caddyfile.local` stale cover image path** — `handle /img/audio/` block updated to `/img/covers/` with matching `content/images/covers` root, matching the production Caddyfile and config. Local dev cover images were being served from the wrong path.
- **`Homepage.js` stale comment** — updated inline comment referencing old `img/audio/152.jpg` path to `img/covers/152.jpg`.

---

## [2026-04-26] (61)

### Fixed
- **Backfill script using wrong clips path** — `backfill-cover-images.js` was still constructing audio paths as `content/YYYY/MM/file.mp3` instead of using `clipsDir` from config (`content/clips/YYYY/MM/file.mp3`). Caused all clips to appear "file missing" during Phase 1.

### Added
- **`--count` and `--list` flags for backfill script** — `--count` prints the number of eligible clips and exits; `--list` prints audioID and title for each. Both respect all other flags (`--prod`, `--untagged-only`, `--limit`, `--offset`, etc.).

---

## [2026-04-26] (59)

### Fixed
- **Search term preserved correctly across page changes** — `parseQuery` in `queryUtils.js` was using `decodeURIComponent` which does not decode `+` as a space. `URLSearchParams.toString()` encodes spaces as `+`, so paginating with a search term caused literal `+` signs to appear in the input and be sent to the backend. Fixed by replacing the manual parser with `new URLSearchParams()`, which handles both `+` and `%20` correctly. Affects `AudioList`, `UserList`, and `RecipeList`.

---

## [2026-04-26] (58)

### Fixed
- **Batch upload duplicate messaging** — distinguished duplicate submissions from retryable upload errors in `AudioBatchUpload.js`. Previously any failure (including permanent duplicates) showed "click Upload to retry." Now: duplicates show a plain informational message; retryable errors show the retry prompt; mixed outcomes report each category separately.
- **Hero image onError infinite loop** — added `e.target.onerror = null` before setting the fallback src so a broken fallback URL doesn't re-trigger the handler indefinitely.

---

## [2026-04-26] (57)

### Changed
- **Updated Zenodo DOI** — updated badge, doi, and url fields in `README.md` to the 2026.04.02 release DOI (`10.5281/zenodo.19774081`).

---

## [2026-04-25] (56)

### Fixed
- **Hero image `src="null"` rendering** — hero image is now conditionally rendered only when a URL is available. `onError` fallback now correctly passes the loaded alt image list to `getHeroImageURL()`.

---

## [2026-04-25] (53)

### Changed
- **Removed static homepage image assets** — deleted `AdminClient/public/img/homepage/` (15 PNG files). Hero image fallback now served entirely from `content/images/alt/` via the API. Alt images unified — one pool, one source.

---

## [2026-04-25] (52)

### Changed
- **Homepage fallback hero image now fetched dynamically** — `Homepage` fetches `/api/audio/altimages` on mount and passes the list to `getHeroImageURL()`. Removed hardcoded `homepageImages` array and `homepageImageURLBase` from `AdminClient/src/config/config.js`. `getHeroImageURL()` updated to accept the list and use `altImageURLBase` from config.

---

## [2026-04-25] (50)

### Added
- **`GET /api/audio/altimages` endpoint** — returns sorted list of image filenames from `content/images/alt/`. No auth required. Groundwork for replacing the hardcoded `homepageImages` array in the AdminClient.

---

## [2026-04-25] (49)

### Changed
- **Cover image URL paths pulled from config** — removed hardcoded `img/audio/` and `img/alt/` strings from `CoverSelector.js`; added `urlPath` and `altUrlPath` to `config.content.coverImage` so Caddy serve paths are defined in one place.
- **Cover images moved to `content/images/covers/`** — renamed dir and updated all references: `config/config.js`, `AdminClient/src/config/config.js`, `Caddyfile.server`. Files moved on disk locally and on prod.

---

## [2026-04-25] (48)

### Changed
- **Audio clips moved to `content/clips/`** — renamed `contentFileDir` → `clipsDir` in config; updated all references in `audioRoutes.js`, `MixEngine.js`, `audioAnalysisRunner.js`, and `backfill-checksums.js`. Files moved on disk; DB filenames unchanged (still relative `YYYY/MM/file.mp3`).
- **MixEngine reads alt image dir at startup** — `CoverSelector` now uses `fs.readdirSync(ALT_DIR)` at startup instead of a hardcoded count; removed `altNum` from config. Any filename works; adding images requires only a MixEngine restart.

---

## [2026-04-25] (47)

### Fixed
- **Hero image now displays as square** — added `aspect-ratio: 1/1` and `object-fit: cover` to `.hero-image-container img` so the hero crops to a square regardless of source dimensions.
- **Cover image uploads now crop to 500×500** — changed ffmpeg filter from contain (`force_original_aspect_ratio=decrease`) to cover (`force_original_aspect_ratio=increase,crop=500:500`) so all saved cover images are exactly 500×500.

---

## [2026-04-25] (46)

### Changed
- **Cover image identifiers now carry their full path** — `CoverSelector` now returns `img/audio/{id}.jpg` or `img/alt/{name}.jpg` instead of bare IDs or `coveralt-XX` strings. The client's `resolveCoverImageURL` is now a one-liner (`/${coverImage}`) with no string-prefix logic needed to distinguish clip covers from alt images.
- **Expanded alt image pool** — added 23 new 500×500 JPEG alt images (`coveralt-15` through `coveralt-37`) to `content/images/alt/`; updated `altNum` in config from 15 → 38.

---

## [2026-04-25] (45)

### Fixed
- **Profile meta stats left-align on mobile** — wrapped the "Member since / Last contributed / total plays / role / status" block in a `profile-card-meta` div; added a CSS rule to left-align those items when the two-column layout stacks below 700px.
- **Batch upload button re-enables on error** — `isSubmitReady` now checks for `hasRetryableFiles` (any file in `Error` state), so the Upload button stays active after a partial failure and the user can retry without reloading. Error messages updated to hint at retry.
- **Batch upload button reflects in-progress state** — `isLoading` was declared but never set to `true`. Now set at start of submit, cleared on completion. Button label changes to "Uploading…" and is disabled during the in-flight request.
- **`coveralt-11.jpg` reconverted with cover mode** — the sunset logo was previously converted with `contain` (letterboxed); reconverted locally and on prod using `scale+crop` (fill) so it fills the full 500×500 frame.

### Changed
- **Backfill script cleanup** — major housekeeping pass on `scripts/backfill-cover-images.js`: replaced inconsistent `--phase1/2/3` flags with parallel `--start-phase N` / `--stop-phase N`; added `--untagged-only` flag for new audio records; lifted all tunables into a Constants block (`BATCH_DELAY_MS`, `FETCH_TIMEOUT_MS`, `HAIKU_MAX_TOKENS`, `ITUNES_ART_SIZE`, `USER_AGENT`); extracted `makeBatches()` and `done()` helpers; reordered helper functions to match phase order (2a → 2b → 2d → 3a → 3b); replaced `99999` LIMIT hack with MySQL's max BIGINT; fixed Phase 3a header comment (was "Google", now "DDG"); added `config.js` entry for `imageFromGoogle` internal tag.

---

## [2026-04-24] (44)

### Fixed
- **Hero image simplified: reads directly from Redux** — removed the `onCurrentMix` callback prop from `Playlist` → `Homepage`. `Homepage` now reads `state.queue.playlist[1]?.coverImage` directly via `useSelector`. The cover is already in the playlist payload from `fetchQueuePlaylist`; no callback, no extra state, no extra fetch needed. Also added project-level `CLAUDE.md` with permanent DB/server access instructions.

## [2026-04-24] (43)

### Fixed
- **Hero image now reliably shows what's actually on air** — switched from independently re-deriving the current mix in Redux to passing it via an `onCurrentMix` callback from Playlist to Homepage. (Superseded by release 44.)

### Added
- **Cover image backfill: `--retry-not-found` flag** — re-runs Phase 2 (Haiku + iTunes) on clips previously tagged `image-not-found`, stripping version/modifier suffixes (isolated vocals, slowed, dates, etc.) from search queries so the base artist + title hits iTunes correctly (e.g. "Pearl Jam - Black - Isolated Vocals" → search "Pearl Jam Black").

---

## [2026-04-23] (42)

### Fixed
- **Hero image index corrected** — initial fix used `[0]` → `[1]` in `Homepage.js`, but the production client was not rebuilt so the change never took effect. This release delivers the properly rebuilt client.

---

## [2026-04-23] (41)

### Fixed
- **Homepage hero image now tracks what's actually on air** — Liquidsoap prefetches the next mix for crossfading, marking it `Played` in the DB before it starts. `queuePlaylist[0]` is therefore always one mix ahead of what listeners hear. Switched hero image source from `[0]` to `[1]`, matching the same offset the Playlist component already uses intentionally.
- **Lower clip newness score weight** (0.75 → 0.5) to reduce burst playback when large batches of new clips are uploaded simultaneously.

---

## [2026-04-23] (40)

### Fixed
- **Cover image sync on prod** — set `coverImage = '1827'` on all 46 Bruce Miller clips uploaded to production.

---

## [2026-04-23] (39)

### Added
- **User-facing cover image UI (Phase 7–8)** — contributors and admins can now upload cover art from AudioUpload, AudioEdit, and AudioBatchUpload.
  - `AdminServer/routes/audioRoutes.js` — new `POST /api/audio/cover/:audioID` route: accepts an image upload, resizes via ffmpeg (`scale` only, no letterbox padding), saves as JPEG to `content/images/audio/`, updates `coverImage` in the DB, and stamps `image-from-user` on `internalTags`.
  - `AudioView.js` — displays existing cover art (or placeholder) in a two-column layout alongside the metadata fields.
  - `AudioEdit.js` — cover image panel with live preview; image is uploaded on form Save (no separate button); supports drag-and-drop onto the Choose Image button.
  - `AudioUpload.js` — same cover image panel; image is uploaded immediately after the audio file upload succeeds, before navigating away.
  - `AudioBatchUpload.js` — cover image panel applies the same image to every file in the batch; Upload Status moved back to its own group.
  - `index.css` — two-column `form-group-with-image` layout, 160×160 cover panel, `object-fit: cover` display, styled `cover-image-upload-btn` matching native file-input appearance.

### Fixed
- **react-dnd dual-backend crash** — `react-tag-input`'s `WithContext` wrapper mounts its own `DndProvider` per instance; having two `TagInput` components on the same page (tags + internalTags) caused "Cannot have two HTML5 backends at the same time." Switched to `WithOutContext` in `formUtils.js` and added a single `DndProvider` at the app root in `index.js`.
- **Upload button stayed disabled** — `record.tags` was not initialized in `AudioUpload` state, so it was `undefined` (falsy) until a tag was committed. Fixed by initializing `tags: []` and checking `record.tags?.length > 0` in `isFormValid`.

---

## [2026-04-23] (38)

### Added
- **Homepage cover image (Phase 6)** — hero image on the homepage now shows the cover art of the most recently played mix; falls back to a random homepage image when no recent mix has cover art.
  - `Caddyfile.local` / `Caddyfile.server` — added `handle /img/*` block serving `content/images/` so cover images are accessible at `/img/audio/{id}.jpg` and `/img/alt/{name}.jpg`.
  - `AdminClient/src/config/config.js` — added `coverImageURLBase` (`/img/audio`) and `altImageURLBase` (`/img/alt`).
  - `store/store.js` — registered `queueSlice` in the Redux store (was missing; caused runtime crash).
  - `Homepage.js` — reads `playlist[0].coverImage` from Redux queue state; resolves to URL via `resolveCoverImageURL()` (routes alt names vs clip IDs to the correct base path); falls back to `getHeroImageURL()`.

---

## [2026-04-23] (37)

### Added
- **Mix cover image and metadata (Phase 5)** — mixes now carry a cover image and ID3 tags.
  - `ClipSelector.js` — `coverImage` added to the fields propagated from the DB clip onto the recipe clip object (including the `repeat(n)` path).
  - `CoverSelector.js` (new, `MixEngine/core/services/covers/`) — walks recipe tracks/clips in order, returns the first clip's `coverImage`; falls back to a randomly chosen alt image. Silence and no-art clips are skipped naturally.
  - `Conductor.js` — instantiates `CoverSelector`; after clip selection sets `mixDetails.coverImage`, `mixDetails.coverImagePath`, and `mixDetails.mixTitle` (`"Recipe - First Clip"`).
  - `MixEngine.js` — `_embedMetadata()` runs a second ffmpeg pass (audio stream-copy, no re-encode) after the mix is built, embedding ID3 title, artist (from `config.brand.streamArtist`), and APIC cover art.
- **Brand config abstraction** — site name, URL, artist tag, and album tag moved to `config.brand` (`siteName`, `siteUrl`, `streamArtist` getter, `streamAlbum`) so they have a single source of truth across the system. `streamAlbum` is intentionally blank to overwrite any album tag left by ffmpeg's first pass.
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
