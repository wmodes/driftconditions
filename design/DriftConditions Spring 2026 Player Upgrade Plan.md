# DriftConditions Implementation Plan
## Spring 2026 Player Upgrade

## Purpose

This plan covers improvements to the DriftConditions listener experience, centered on the audio player. It addresses a known multi-tab bug, introduces enhanced listening modes (fullscreen, sleep timer), adds basic social engagement features (share, favorites), and scopes out larger ambitions (casting, app distribution, platform reach). This is a living document and will be updated as implementation details emerge.

---

## 1. Goals and Scope

### 1.1 Goals

1. **Fix multi-tab playback coordination** — resolve the bug where stopping playback in one window triggers playback in another.
2. **Honor user intent** — play/stop state should reflect the listener's last deliberate action, regardless of how many tabs or windows are open.
3. **Enhanced listening modes** — fullscreen and sleep timer for a more intentional listening experience.
4. **Mobile-first polish** — all player features must work gracefully on mobile as well as desktop.
5. **Engagement and sharing** — let listeners favorite a mix and share what they're hearing.
6. **Platform reach** — investigate and implement distribution beyond the web player (cast, app, streaming platforms).

### 1.2 Why these goals matter

The current player is functional but fragile. The multi-tab bug actively undermines the listener experience. Enhanced modes (fullscreen, sleep) bring DriftConditions closer to how people actually use ambient audio. Sharing and favoriting add lightweight social hooks that benefit contributors and help grow the audience.

### 1.3 Scope

#### 1.3.1 Player Core & Multi-tab Behavior
- Fix the inverted logic bug in cross-tab playback coordination.
- Redesign the shared-intent model so user actions propagate correctly across tabs/windows.

#### 1.3.2 Enhanced Listening Experience
- Fullscreen mode: dark overlay, current mix graphic and playlist, dismissable.
- Sleep mode: auto-stop after a user-set timer.
- Media Session API integration for OS-level controls (lock screen, headphone buttons).

#### 1.3.3 Engagement and Sharing
- Share button for the current mix.
- Favorite/star a mix.

#### 1.3.4 Platform Reach (including Stretch Goals)
- Investigate podcast/radio directory listings (TuneIn, etc.).
- Cast to devices (Chromecast, AirPlay).
- PWA / App.
- Stream to YouTube Live.

### 1.4 Out of Scope
- Changes to MixEngine, recipe authoring, or audio moderation workflows.
- Any redesign of the contributor or admin interfaces.

---

## 2. Implementation: Player Core & Multi-tab Behavior

### 2.1 The Bug

`AudioPlayer.js` uses `localStorage` events to coordinate playback across tabs. The logic in the `storage` event handler (lines 76–79) and the mount effect (lines 97–100) is inverted:

```js
if (state) {
  audioRef.current.pause(); // another tab started → pause this one ✓
} else {
  audioRef.current.play();  // another tab stopped → play this one ✗ (WRONG)
}
```

When one tab stops, every other open tab starts. The same inversion exists on mount: if the stored state is `false` (stopped), the new tab starts playing.

**Fix:** swap the branches so `state: false` pauses and `state: true` plays.

### 2.2 Redesign: Shared Intent Model

The current design assumes mutual exclusion ("only one tab plays at a time"). The goal is shared intent: the last user action sets global playback intent; all tabs reflect it.

**Desired behavior:**
- User presses Play in any tab → intent is "playing"; all tabs play.
- User presses Stop in any tab → intent is "stopped"; all tabs stop.
- Opening a new tab → reads stored intent and mirrors it.

**Implementation:** Replace the `localStorage` event approach with the [`BroadcastChannel` API](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel), which is designed for exactly this use case and is well-supported in all modern browsers. A `localStorage` fallback can cover Safari if needed.

> **Open decision:** Should opening a new tab auto-start playback if the intent is "playing"? This respects the user's last intent but may surprise users who open a new tab for other reasons. To be decided.

### 2.3 Mobile Behavior

The native `<audio>` element with `autoPlay` is blocked on mobile browsers (requires a user gesture). The current player already handles this in practice because playback is triggered by a tap (the faux player on the homepage). Verify this holds across the enhanced modes added in section 3.

---

## 3. Implementation: Enhanced Listening Experience

### 3.1 Fullscreen Mode

A fullscreen listening mode: the screen goes dark, the current mix cover image fills the view, and the playlist is displayed below or overlaid. Dismissable by tap/click or Escape key.

**Implementation approach:**
- Use the [Fullscreen API](https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API) (`element.requestFullscreen()`) triggered from a button in the player UI.
- A new `FullscreenPlayer` component (or overlay within `AudioPlayer.js`) renders the cover image from Redux (`state.queue.currentMix.coverImage`) and the playlist from `state.queue.playlist`.
- On mobile, "fullscreen" may mean a full-page overlay rather than the native fullscreen API, since mobile browsers restrict it.

> **Open decision:** Does fullscreen include playback controls (play/pause, stop), or just the display? Should the playlist be scrollable or just show the current mix?

### 3.2 Sleep Mode

Auto-stop after a user-set countdown. Common use: falling asleep to ambient audio.

**Implementation approach:**
- A sleep timer UI (e.g., dropdown: 15 min / 30 min / 1 hr / custom).
- A countdown stored in component state; when it reaches zero, call `audioRef.current.pause()` and broadcast the stop intent.
- Optional: fade out over the last 60 seconds rather than hard stop.

> **Open decision:** Should the sleep timer persist across page refreshes (stored in `localStorage`), or reset on navigation?

### 3.3 Media Session API

The [Media Session API](https://developer.mozilla.org/en-US/docs/Web/API/Media_Session_API) lets the OS display playback info on the lock screen and respond to hardware controls (headphone buttons, car displays).

**Implementation:** Set `navigator.mediaSession.metadata` with the current mix title and cover art when a new mix starts. Wire `navigator.mediaSession.setActionHandler` for play, pause, and stop.

This is a small addition with high perceived quality on mobile.

---

## 4. Implementation: Engagement and Sharing

### 4.1 Share

Let listeners share what they're hearing.

**What to share:** A link to the DriftConditions homepage (since the stream is live and continuous, there's no permalink to a specific mix). The share payload would be the site URL with a short description of the current mix title.

**Implementation:**
- Use the [Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API) on mobile (native share sheet).
- Fall back to a copy-to-clipboard button on desktop.
- Share text: `"Listening to [mix title] on DriftConditions — [url]"`.

> **Open decision:** Should sharing include the current playlist details, or just a generic site link?

### 4.2 Favorite / Star a Mix

Let listeners mark a mix as a favorite while it's playing.

**Implementation:**
- A star/heart button in the player UI, visible when a mix is playing.
- On tap: sends a request to a new `POST /api/queue/favorite` endpoint (or similar) with the current `mixID`.
- Requires a new `favorites` table in the DB (or a `favorites` column on `mixQueue`), keyed by `userID` + `mixID`.
- For unauthenticated users: either prompt to sign in, or store anonymously (to be decided).
- Favorited mixes could eventually surface in user profiles or inform recipe weighting.

> **Open decision:** Is favoriting limited to logged-in users? If so, should there be an incentive to sign up to favorite? What, if anything, does a favorite do for contributors or the system?

---

## 5. Stretch Goals

### 5.1 PWA / Installable App

A Progressive Web App makes the site installable on iOS and Android home screens, with offline support and a native-feeling experience.

**What it requires:** A web app manifest (`manifest.json`) and a service worker. React's build tooling (Create React App / Vite) makes this relatively low effort. Most of the enhanced features above (fullscreen, sleep, media session, share) already work as a PWA.

**Decision point:** Native iOS/Android apps are a separate, much larger project. PWA is the recommended starting point unless native-only features (e.g., background audio on iOS without a browser) are required.

### 5.2 Cast to Devices

Chromecast (via the [Cast SDK](https://developers.google.com/cast)) and AirPlay (via `<audio>` with Safari's native controls or WebKit's `x-webkit-airplay`) let listeners send audio to speakers or TVs.

AirPlay requires essentially nothing on our end — Safari exposes an AirPlay button natively on the `<audio>` element. Chromecast requires integration with the Cast SDK and a registered Cast app.

**Recommendation:** Enable AirPlay first (zero-cost, just verify it works). Evaluate Chromecast as a stretch.

### 5.3 Stream to YouTube Live

Re-stream the existing Icecast output to YouTube Live via RTMP. This is a server-side operation — ffmpeg can read the Icecast stream and push it to YouTube's ingest URL.

```bash
ffmpeg -i https://driftconditions.org/stream \
  -c:a aac -b:a 128k \
  -f flv rtmp://a.rtmp.youtube.com/live2/[stream-key]
```

This could be a systemd service alongside MixEngine. No client changes required.

**Open questions:** Does YouTube require a video track for live streams? (Yes — a static image or visualizer would be needed.) Is 24/7 streaming permitted under YouTube's terms for this content type?

### 5.4 Podcast and Radio Directory Listings

Traditional podcast apps (Apple Podcasts, Spotify Podcasts) expect on-demand episodes with an RSS feed — a poor fit for a continuous generative stream.

**Better fits:**
- **TuneIn / iHeartRadio** — internet radio directories that accept Icecast stream URLs. Low barrier, broad reach.
- **Overcast / Pocket Casts** — some podcast apps support live radio streams, but discoverability is poor.

**Recommendation:** Submit to TuneIn as a radio station. Investigate requirements. Skip traditional podcast directories unless an archiving/episodes feature is added later.

---

## 6. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| BroadcastChannel not supported in older Safari | Low | Medium | `localStorage` fallback |
| Mobile autoplay restrictions break fullscreen mode | Medium | Medium | Ensure fullscreen is only triggered by a user gesture |
| Fullscreen API unavailable on some mobile browsers | Medium | Low | Fallback to full-page CSS overlay |
| YouTube 24/7 streaming policy violations | Unknown | High | Review ToS before implementing |
| Favoriting with anonymous users creates spam/abuse vector | Medium | Medium | Require login, or rate-limit by IP |

---

## 7. Verification

- **Multi-tab fix:** Open 3 tabs. Play in tab 1, stop in tab 2 — confirm all tabs stop. Play in tab 3 — confirm all tabs play. Open a new tab mid-playback — confirm expected behavior (per open decision above).
- **Fullscreen:** Verify on mobile (iOS Safari, Android Chrome) and desktop. Confirm cover image and playlist render correctly. Confirm dismiss works.
- **Sleep mode:** Set a 1-minute timer. Confirm audio stops without hard cutoff. Confirm timer resets on page reload.
- **Share:** Verify Web Share API fires on mobile. Verify clipboard fallback on desktop.
- **Favorite:** Confirm star persists after page reload (if logged in). Confirm unauthenticated behavior matches decision.
- **Media Session:** Verify lock screen controls on iOS and Android.

---

## 8. Appendices

### 8.1 Relevant Files

| File | Role |
|---|---|
| `AdminClient/src/components/AudioPlayer.js` | Core player component; `<audio>` element, cross-tab coordination |
| `AdminClient/src/layouts/RootLayout.js` | Mounts `AudioPlayer`; owns `isPlaying` state; passes `togglePlayer` via context |
| `AdminClient/src/pages/Homepage.js` | Renders the faux-player button; consumes `togglePlayer` from outlet context |
| `AdminClient/src/components/Playlist.js` | Playlist display component; polls MixEngine every 60s |
| `AdminClient/src/store/queueSlice.js` | Redux slice; holds `playlist` and `currentMix` (playlist[1]) |
| `AdminClient/src/config/config.js` | `config.stream.url` — the Icecast/FastCast stream URL |

### 8.2 Open Decisions

1. **New-tab autoplay:** Should a new tab auto-start if the global intent is "playing"?
2. **Fullscreen controls:** Play/pause included in fullscreen view?
3. **Sleep timer persistence:** Survive page refresh or reset?
4. **Share payload:** Site URL only, or include current mix details?
5. **Favoriting and auth:** Logged-in only? What does a favorite do downstream?
6. **App path:** PWA first, or straight to native?
7. **YouTube:** Static image or visualizer for video track? Review streaming ToS.
