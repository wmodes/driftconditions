# DriftConditions

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.19774081.svg)](https://doi.org/10.5281/zenodo.19774081)

*DriftConditions* is an online audio source that captures the chaos and serendipity of late-night radio tuning — an uncanny audio stream generated entirely on the fly by code. Overlapping fragmented stories, ambient sounds, and mysterious crosstalk weave a vivid sonic tapestry, drawing listeners into an immersive and unpredictable listening experience.

Inspired by the unpredictability of real-world radio interference, *DriftConditions* explores the boundaries between intention and happenstance, inviting listeners to eavesdrop on a hidden world of voices and atmospheres unconstrained by traditional narrative structures. Every session is unique — it will never be heard exactly the same way again.

**Listen live:** https://driftconditions.org/

---

## How It Works

The experience is built from three layers:

1. **Content** — contributors upload audio clips (music, field recordings, spoken word, ambient sound) through a web interface. Editors and moderators review and tag everything.

2. **Recipes** — editors write JSON-like recipes that describe how clips should be combined: how many tracks, what kinds of audio go on each track, how long, what effects to apply. Recipes are the creative blueprints for each soundscape.

3. **The Mix Engine** — a backend server reads the recipes, stochastically selects clips that match each recipe's criteria, and assembles them into a continuous audio stream using FFmpeg filter chains. The stream is broadcast live via Icecast.

Several elements are procedurally generated to keep every session fresh:

- **Hero image** — uses a hash to select from AI-generated images, varying by session and week
- **Descriptive text** — the Tracery grammar library generates new homepage copy on every visit
- **Recipe selection** — stochastic acceptance weighted toward least-recently-used recipes
- **Clip selection** — stochastic acceptance weighted toward clips that match the recipe's tags and classification, and toward least-recently-used clips
- **Audio modulation** — a coherent noise function (a harmonic series of sine waves) modulates volume and effects in real time

---

## Architecture

```
AdminClient/    React SPA — runs in the browser; talks to AdminServer
AdminServer/    Express API — users, clips, recipes, email, scheduled jobs
  └── MySQL         primary data store
MixEngine/      audio generation — builds FFmpeg filter chains from recipes
  └── FFmpeg        encodes and processes audio
  └── Liquidsoap ──► Icecast ──► browser (live audio stream)
config/         shared configuration module (used by AdminServer + MixEngine)
```

Four parallel services, each running as its own Node.js process:

### Components

**AdminClient** — A React single-page application. Handles authentication, contributor uploads, recipe editing, audio moderation, and admin functions. Built with Redux for state management and a custom Ace editor integration for recipe authoring.

**AdminServer** — An Express API server that manages everything behind the scenes: user accounts, audio uploads, recipe storage, moderation queues, email notifications, and scheduled background jobs. Also serves the built React app via Caddy (a reverse proxy that handles SSL).

**MixEngine** — A separate Express server responsible for generating audio mixes. It reads a recipe, selects matching clips from the database, and builds complex FFmpeg filter chains to mix, normalize, loop, and process the audio. Outputs mix files consumed by Liquidsoap.

**Icecast + Liquidsoap** — Liquidsoap feeds a continuous stream of mix files into Icecast, which serves the audio to listeners. Liquidsoap handles transitions between mixes and falls back to a backup stream if the mix queue runs dry.

**MySQL** — Stores users, audio clips, recipes, mix queue, clip usage history, audit logs, and pending email events.

**Systemd timers** — Two scheduled background jobs run on the server:
- *Digest runner* — sends contributors a periodic email digest of their clip approvals, disapprovals, and contribution stats
- *Audio analysis runner* — processes newly uploaded music clips through Essentia.js to automatically suggest BPM, musical key, and danceability tags

---

## User Roles

The platform has a graduated permission system:

| Role | Can do |
|------|--------|
| **User** | Create an account, listen |
| **Contributor** | Upload audio clips |
| **Editor** | Upload clips, create and edit recipes |
| **Mod** | Everything above + moderate audio, manage users |
| **Admin** | Full access |

Role changes trigger an email notification to the user and adjust their digest frequency automatically.

---

## Authentication

Users can sign in with a username/password or via OAuth 2.0 with **Google**, **GitHub**, or **Discord**. Sessions are managed with signed JWTs stored in HTTP-only cookies.

---

## Email & Digest System

AdminServer includes a Handlebars-templated email system backed by Nodemailer. Emails are sent for:

- **Role changes** — when a mod promotes a contributor, the user is notified
- **Clip approvals/disapprovals** — queued as events, batched into digests
- **Contribution digests** — sent on a per-user schedule (daily / weekly / monthly / yearly) summarizing recent activity and contribution stats
- **Welcome / anniversary reminders** — onboarding prompts for inactive new users

The digest runner is triggered nightly by a systemd timer and processes each user's pending event queue independently.

---

## Audio Analysis Pipeline

When a music clip (Instrumental, VocalMusic, or Ambient) is uploaded, it is automatically queued for analysis. A nightly systemd timer runs `audioAnalysisRunner.js`, which:

1. Finds clips tagged `needs-audio-analysis`
2. Passes each clip through `experiments/essentia/analyze.js` — a Node.js script using [Essentia.js](https://essentia.upf.edu/essentia.js) (compiled to WASM)
3. Analyzes the middle 180 seconds of the clip for:
   - **BPM** — e.g. `102-bpm`; clips over 120 BPM also emit a halved tag to catch double-time detection
   - **Musical key** — e.g. `g-minor-key`, `a-flat-major-key`
   - **Danceability** — tags as `danceable` if above threshold
4. Merges the suggested tags into the clip's tag list and swaps `needs-audio-analysis` for `audio-analyzed`

---

## Recipes

Recipes are JSON-like text files (comments allowed) that describe a soundscape as a set of simultaneous tracks, each containing one or more clips.

### Basic structure

```javascript
{
  tracks: [
    {
      track: 0,          // track index (0–4); tracks play simultaneously
      label: "bed",      // optional name, used for duck(label) references
      volume: 80,        // track volume 0–100
      effects: [ ... ],  // track-level effects (see below)
      clips: [
        {
          classification: [ "Ambient", "Atmospheric" ],
          tags: [ "drone", "ambient" ],
          length: [ "long", "huge" ],  // tiny | short | medium | long | huge
          volume: 100,
          effects: [ ... ],            // clip-level effects
        }
      ]
    }
  ]
}
```

**Length categories:**
- `tiny` — 0–10 seconds (most sound effects)
- `short` — 10 seconds – 2 minutes
- `medium` — 2–5 minutes (most music)
- `long` — 5–10 minutes
- `huge` — 10–60 minutes (long soundscapes, environmental recordings)

### Supported effects

**Structural (track-level — control mix duration):**
- `trim` — this track's duration sets the mix length
- `first` — the first track with this effect sets the mix length
- `shortest` — mix ends when the shortest track ends
- `longest` — mix ends when the longest track ends
- `crossfade` — crossfade between clips on this track
- `fadeout` — fade the track out at the end of the mix

**Looping:**
- `loop` / `repeat` — loop to fill the mix duration
- `loop(n)` / `repeat(n)` — loop exactly *n* times

**Normalization:**
- `norm` — normalize to a default level
- `norm(voice)` — normalize optimized for speech
- `norm(music)` — normalize optimized for music
- `norm(bed)` — normalize for use as a background bed

**Color and texture:**
- `backward` / `reverse` — reverse playback
- `faraway` / `distant` — low-pass filter + reverb, sounds far away
- `telephone` — narrow bandpass for a telephone/radio effect
- `detune` — subtle pitch detune

**Dynamic volume (modulation):**
- `wave` / `noise` — modulate volume with a coherent noise function
- `wave(noise)`, `wave(noise2)` — noise variants
- `wave(inverse)` — inverted wave
- `wave(subtle)`, `wave(subtle2)` — subtle modulation
- `wave(liminal)` — slow liminal/transition sweep
- `duck(label)` — sidechain: this track ducks when the named track is active

### Example recipe

A slow narrative over a drone bed:

```javascript
{
  tracks: [
    {
      // Ambient drone bed — loops, fades out with the mix
      track: 0,
      label: "bed",
      volume: 60,
      effects: [ "loop", "fadeout", "norm(bed)", "wave(subtle)" ],
      clips: [
        {
          classification: [ "Ambient" ],
          tags: [ "drone", "ambient" ],
          length: [ "long", "huge" ],
        }
      ]
    },
    {
      // Spoken word — sets the mix duration, duck the bed when active
      track: 1,
      volume: 100,
      effects: [ "trim" ],
      clips: [
        {
          classification: "silence",
          length: [ "short" ]
        },
        {
          classification: [ "narrative", "spoken" ],
          tags: [ "story", "reading" ],
          length: [ "medium", "long" ],
          effects: [ "norm(voice)", "duck(bed)" ],
        },
        {
          classification: "silence",
          length: [ "short" ]
        }
      ]
    }
  ]
}
```

---

## Technologies

### AdminServer
- **Node.js + Express** — API server and request routing
- **MySQL** (via `mysql2`) — primary data store
- **JWT** (`jsonwebtoken`) + **bcrypt** — session tokens and password hashing
- **OpenID Client** (`openid-client`) — OAuth 2.0 for Google, GitHub, and Discord sign-in
- **Nodemailer** + **Handlebars** — transactional and digest email system
- **Multer** — multipart file upload handling
- **fluent-ffmpeg + ffprobe-static** — audio duration detection and processing
- **comment-json** — parses recipe files (JSON with comments)
- **express-rate-limit** — brute-force protection on auth endpoints
- **Anthropic SDK** — AI-assisted content features

### AdminClient
- **React 18** + **Create React App**
- **Redux Toolkit** + **react-redux** — global state management
- **react-router-dom** — client-side routing
- **axios** — HTTP client
- **react-ace** + **ace-builds** — in-browser code editor for recipes
- **wavesurfer.js** — audio waveform visualization
- **feather-icons-react** — UI icons
- **react-tag-input** — tag field component
- **tracery-improved** — procedural text generation for homepage copy
- **TailwindCSS** — utility CSS framework

### MixEngine
- **Node.js + Express** — mix generation API
- **fluent-ffmpeg + ffprobe-static** — FFmpeg filter chain construction and audio encoding
- **comment-json / json5** — recipe parsing
- **JWT** — internal service authentication

### Shared config module
- **dotenv** — environment variable loading
- **mysql2** — database connection pooling
- **winston** — structured logging

### Infrastructure
- **Caddy** — reverse proxy and automatic SSL termination
- **Icecast** — audio streaming server
- **Liquidsoap** — stream source, feeds mixes into Icecast
- **systemd** — service management and scheduled timers (digest, audio analysis)

---

## Development Setup

> See `NOTES.md` for port maps, server maintenance notes, and detailed technical reference.

### Prerequisites

- Node.js 18+ (pinned in `.nvmrc`)
- MySQL running locally
- FFmpeg installed system-wide
- Caddy (for local reverse proxy + SSL)
- Icecast + Liquidsoap (optional, for full stream testing)

### Running locally (dev mode)

```bash
# Terminal 1 — AdminServer
cd AdminServer && npm start

# Terminal 2 — MixEngine
cd MixEngine && npm start

# Terminal 3 — AdminClient (hot reload)
cd AdminClient && npm start   # http://localhost:3001

# Terminal 4 — Caddy reverse proxy
sudo caddy run --config setupfiles/Caddyfile.local

# Terminal 5 — Liquidsoap (optional)
liquidsoap setupfiles/liquidsoap.liq

# Terminal 6 — Icecast (optional)
icecast -c /usr/local/etc/icecast.xml
```

### Production deployment

Services are managed by systemd on a Debian server. After pushing changes:

```bash
cd ~/driftconditions && git pull

# Rebuild the React client if frontend files changed
cd AdminClient && npm run build

# Restart the API server
sudo systemctl restart adminserver

# Restart the mix engine if needed
sudo systemctl restart mixengine
```

---

## Contributing Audio

The station relies on community audio contributions. To contribute:

1. **Sign up** at https://driftconditions.org/
2. **Request contributor access** — a moderator will promote your account
3. **Upload clips** through the contributor interface

We ask that all submissions be original works, public domain, or Creative Commons licensed content for which you have clear rights. No copyrighted material without permission.

---

## Author

**Wesley Modes**  
University of Cincinnati  
ORCID: [0009-0000-1191-8245](https://orcid.org/0009-0000-1191-8245)

---

## Citation

If you use or reference *DriftConditions* in academic work, please cite it as:

```bibtex
@software{modes_2026_driftconditions,
  author    = {Modes, Wesley},
  title     = {{DriftConditions}: A Generative Audio Streaming Platform},
  year      = {2026},
  publisher = {Zenodo},
  doi       = {10.5281/zenodo.19774081},
  url       = {https://doi.org/10.5281/zenodo.19774081},
  orcid     = {0009-0000-1191-8245}
}
```

---

## License

MIT — see `MIT-LICENSE.txt`
