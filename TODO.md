# DriftConditions TODO

---

## UI/UX

### Add
- [x] Batch audio upload form
- [x] Audio List: quick edit row (title, status, classification, tags, comments)
- [x] Recipe List: quick edit row (title, status, description, classification, tags, comments)
- [x] Audio List: full-text search across title, tags, comments (AND logic, quoted phrases)
- [x] Field notes and annotations on all upload and edit forms
- [x] "Add New" link on Audio Edit, Audio View, Recipe Edit, Recipe View
- [x] Warn before navigating away from unsaved edit pages
- [x] On-the-fly and submit validation on recipe form
- [x] Copyright/public domain note appended to audio upload form
- [x] "More info" toggle in playlist display
- [x] Breadcrumb navigation on Audio View, Recipe View, Recipe Edit
- [ ] Delete recipe button: red destructive action at bottom of Recipe Edit
- [ ] Delete audio button: red destructive action at bottom of Audio Edit and in quick edit row
- [ ] Clip usage count display on Audio View and Audio Edit — show how many times a clip has been used in recipes; depends on MixEngine usage tracking (see MixEngine → Add). Requires backend query against `clipUsage` table and a new field in the audio info route response.
- [x] User List: inline Quick Edit row — Role and Status dropdowns; reuses profileEdit thunk
- [ ] Thumbs up/down rating for playlist items — also flags clip against deletion
- [ ] Mobile: per-playlist image (album art, à la Spotify) when playing on phone

### Change
- [x] Audio duration display: raw seconds → m:ss format (Audio List, Edit, View)
- [x] Recipe View and Audio View widened to match Edit page width
- [x] Audio upload: auto-generate title from filename if title field is blank
- [x] Upload form: require at least one classification and one tag before enabling submit
- [x] Playlist: display next item's start time rather than current item's own time
- [x] Remove first playlist item (was always one ahead of actual stream position)
- [x] Classification labels: ensure "vocal" and "instrumental" specify music
- [x] Audio player: don't restart clip on navigation unless it should (persistent player continuity)

### Fix
- [x] Audio List: active status filter shown as chip; user filter shown as dismissible chip, stacks with status and search
- [x] Audio List: play/stop icon not clearing after audio ends naturally
- [x] Audio upload: classification checkboxes blank after redirect to edit page
- [x] TagInput: initial tags not displaying on edit pages
- [x] Classification field occasionally blank when editing audio or recipes
- [x] Date display for editor field on Recipe View and Audio View
- [x] Role List: crash on queryParams destructure when params undefined
- [x] Error responses standardized — meaningful one-line messages surface throughout UI
- [x] Pass errors from audio upload and audio edit routes all the way back to form (3.2)
- [ ] Success message on single Audio Upload (currently navigates away; no confirmation shown)

---

## MixEngine

### Add
- [x] Tracery with node elimination
- [x] First-shortest-loop logic
- [x] Effects: `detune(n)`, `detune(n, inverse)`, `1/detune`
- [x] Config section: ffmpeg expressions that can reference each other
- [x] Tuning: increase weight of tags vs recency in clip selection
- [ ] FILTER: `fadeout` — fade clip out at end
- [ ] FILTER: `loop(n)` — repeat clip n times
- [ ] FILTER: `repeat(n)` — reuse a previously selected clip
- [ ] FILTER: music bed fades down to follow another track's level
- [ ] RECIPE: environmental/field recording only (if it doesn't already exist)
- [ ] Recipe length weighting — without it, long environmental clips dominate the stream
- [ ] Track how many times each clip is selected and played — requires new `clipUsage` table (audioID, recipeID, playedAt) and instrumentation at the point in the MixEngine where a clip is selected and queued. Feeds both the UI display (2.6) and usage-weighted selection below. Consider: write performance under high playlist churn, and whether to track selections or confirmed plays.
- [ ] Weight clip selection by prior usage — prefer less-used clips; depends on usage tracking above

### Change
- [x] Renamed "narrative with music bed" → "short/long narrative with music bed"
- [ ] Improved exprs syntax/parser
- [ ] Make music element loop on Narrative With Music Bed, or add more instrumentals + `first` effect

### Fix
- [x] Duration calculation: silences + audio not computing correctly (was using minLength of silences)
- [x] Silence timing: track with silence was longer than parallel track
- [x] Norm filter: `norm()` with no params was breaking ffmpeg
- [ ] Duration occasionally NaN — search mixengine.service log for 'Unable to parse option value "NaN"'
- [ ] Length selection in ClipSelector: clips outside requested range being chosen (100s clip for 120s–60m recipe)
- [ ] Normalization level too low on some clips (e.g. Alan Watts Human Consciousness)
- [ ] Volume balance in filter chain — background ambient louder than foreground in some mixes
- [ ] DEBUG: Something is up with Long Narrative With Music Bed recipe

---

## Backend / Infrastructure

### Add
- [x] Log rotation service
- [x] Persistent player (stream continuity)
- [x] Prune mixes job (remove stale/old mixes)
- [x] Duplicate upload detection: MD5 checksum on upload; backfill script for existing records
- [ ] Notify contributors by email when submitted audio is approved (see digest system plan, 8.4.2)
- [ ] Audit table instrumentation: currently nothing is written to it — fix for auth and user change events
- [ ] Fix direct navigation to protected URLs (e.g. /audio/upload) when not logged in — currently causes an error; user needs to log in first then navigate. Affects contributor-digest-reminder email links.
- [ ] YouTube / Twitch stream output

### Change
- [x] snake_case DB fields converted to camelCase across remaining tables — code hygiene affecting routes and queries
- [x] Recipe data structure: array `[{track: 0}]` → object `{tracks: [{track: 0}]}` — internal format correctness
- [ ] Remove or consolidate file-based logging to `log/*`

### Fix
- [x] User edit: persistent bug with user record updates
- [x] Audio route: add editorID and editDate to responses
