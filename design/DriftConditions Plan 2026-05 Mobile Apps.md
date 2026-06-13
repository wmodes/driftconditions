# DriftConditions Implementation Plan
## Summer 2026 Mobile Apps

---

## 1. Purpose

This plan covers the design and development of a native mobile application for DriftConditions, bringing the station's generative audio stream to `iOS` and `Android` devices. The app is listener-focused: it does not replicate the administrative, editorial, or recipe-authoring interfaces of the web platform. Instead, it delivers the core experience — streaming audio, browsing what's playing, favoriting mixes, and submitting audio — in a form native to how people actually listen to ambient and generative content: with their phone in their pocket, screen off, headphones on.

The existing web platform is built in `React` with a well-defined API, `JWT`-based authentication, and role-based access control. This document details how those existing systems are extended to support a mobile client, and how the app is structured to stay in sync with ongoing platform development.

This document reflects the state of the implementation as of Summer 2026, incorporating technical decisions, architectural lessons, and feature additions discovered during development.

---

## 2. Goals and Scope

### 2.1. Goals

1. **Deliver the listening experience natively** — stream DriftConditions audio with full background playback, lock screen controls, and headphone button support on both `iOS` and `Android`.
2. **Surface what's playing** — display the current mix's cover image, playlist, and track metadata in a clean, focused UI.
3. **Support intentional listening modes** — sleep timer for listeners who fall asleep to the stream.
4. **Enable listener engagement** — allow listeners to favorite a mix.
5. **Enable audio submission** — contributors can submit audio clips from the app, authenticated against the existing role-based system.
6. **Honor the existing auth/authz model** — sign-in, session management, and role-based access reuse the current `JWT` infrastructure, adapted for a mobile context.
7. **Support social sign-in** — OAuth providers (Google, GitHub, Discord) are supported alongside username/password login.
8. **Support Cast and AirPlay** — listeners can send the stream to Chromecast-compatible devices and AirPlay receivers.
9. **Ship to the Apple App Store** — iOS is the primary target; Google Play follows as a stretch goal.

### 2.2. Why These Goals Matter

The DriftConditions stream is ambient by nature — the kind of audio people put on to work, sleep, or move through the world. That use pattern is fundamentally mobile. The current web player supports background audio and lock screen controls via the `Media Session API`, but mobile browsers throttle background tabs — interrupting playback when the screen locks or the user switches apps. A native app eliminates that constraint. Favoriting gives listeners a lightweight way to engage with the stream. Audio submission matters because contributors are a key part of what keeps the station alive; removing friction from their workflow — including on mobile — supports the health of the library.

Cast and AirPlay extend the listening experience to speakers, TVs, and shared spaces. A listener who starts the stream on their phone should be able to hand it off to a Google Home or AirPlay receiver without leaving the app.

### 2.3. Technology Choice

Three approaches were evaluated:

- **PWA (Progressive Web App):** Zero new infrastructure, installable from a browser. Rejected because Apple restricts background audio on `iOS` — a hard constraint for a streaming app.
- **Capacitor:** Wraps the existing `web frontend` in a native shell with access to native APIs. A reasonable option, but its primary advantage is reusing existing HTML/CSS UI — which doesn't apply here, since the mobile UI is a new, stripped-down interface rather than a port of the admin-heavy web client.
- **React Native:** Builds a native UI using `React` component patterns. The existing frontend is already `React`, so hooks, state management, and API call patterns transfer directly. The `react-native-track-player` library provides purpose-built background audio, lock screen controls, and headphone integration for both platforms. **Selected.**

### 2.4. Scope

#### 2.4.1. Audio Streaming

- Live stream playback via `react-native-track-player`
- Background audio with OS-level lock screen and headphone controls
- Play/stop controls; auto-reconnect on stream dropout
- Cast to Chromecast-compatible devices via `react-native-google-cast`
- AirPlay routing via custom native `RNAirplayRouter` module

#### 2.4.2. Playlist and Cover Display

- Current mix hero/cover image
- Playlist of recent and upcoming tracks
- Mix metadata (title, contributors)

#### 2.4.3. Listening Modes

- Sleep timer: auto-stop after a user-set duration, with fade-out

#### 2.4.4. Listener Engagement

- Favorite/star a mix

#### 2.4.5. Audio Submission

- Upload an audio file from the device
- Requires authentication as a Contributor or higher
- Reuses the existing `/api/audio` upload endpoint
- Supports iOS share sheet (audio files shared from Voice Memos, Files, etc.)

#### 2.4.6. Authentication

- Sign-in and sign-out using the existing auth endpoints
- `JWT` stored in the device keychain via `react-native-keychain` (adapted from the web platform's HTTP-only cookie model)
- Sliding session renewal matching the web platform's token refresh logic
- Role-based access: submission UI gated on Contributor role
- OAuth social sign-in: Google, GitHub, Discord

#### 2.4.7. Stretch Goals

- Google Play / Android release
- Fullscreen immersive mode

### 2.5. Out of Scope

- Admin interfaces: audio moderation, recipe authoring, user management (audio submission is the sole exception)
- Any changes to `MixEngine`, `AdminServer`, or the existing `web frontend`

---

## 3. Implementation Approach

### 3.1. Project Structure

The mobile app lives in a new top-level directory, `MobileApp/`, within the existing DriftConditions monorepo. This standalone React Native project is initialized with the React Native CLI to avoid complications with background audio and native module access. The client communicates exclusively with the existing `AdminServer` API, reusing current endpoints without requiring any new backend routes.

### 3.2. Key Dependencies

This project relies on several key dependencies to deliver native functionality. The table below outlines the primary libraries, their pinned versions, and their roles in the mobile application architecture. Version pinning is critical: several libraries have confirmed regressions in newer releases that affect core functionality.

| Library | Version | Purpose |
|---|---|---|
| `react-native-track-player` | 4.1.2 | Background audio, lock screen controls, headphone buttons |
| `react-native-google-cast` | 4.6.1 | Google Cast (Chromecast) session management |
| `google-cast-sdk-dynamic-xcframework-no-bluetooth` | 4.7.1 | iOS Cast native SDK (pinned in `Podfile.lock`) |
| `react-native-keychain` | 10.0.0 | Secure JWT storage in the device keychain |
| `@react-native-async-storage/async-storage` | 3.1.0 | User preference persistence (e.g., Cast discovery consent state) |
| `react-native-svg` | 15.15.5 | SVG icon rendering (Cast, AirPlay, Share icons) |
| `react-native-safe-area-context` | 4.14.1 | Notch/status bar handling across devices |
| `react-native-image-picker` | 8.2.1 | Cover image selection for audio submission |
| `react-native-document-picker` | 9.3.1 | Audio file selection for submission |
| `react-native-inappbrowser-reborn` | 3.7.1 | OAuth flows via `ASWebAuthenticationSession` on iOS |
| `react-native-screens` | 3.29.0 | Native screen containers (used by navigation) |

**Version pinning notes:**

- `react-native-track-player` 4.1.2 is pinned because it breaks on React Native 0.74+. The project targets RN 0.73.6.
- `react-native-google-cast` 4.6.1 is pinned because `google-cast-sdk` 4.8.x has a confirmed iOS device discovery regression (GitHub issue #545). The fix used by the community is to stay on 4.6.1 JS + pin the native xcframework to 4.7.1 via `Podfile.lock`.
- Do not upgrade either Cast library without researching the current state of that regression.

### 3.3. Authentication Adaptation

Authentication requires adapting the existing JWT model to the mobile environment to maintain security and session logic. Because native apps cannot access HTTP-only cookies, the mobile client stores the JWT in the device keychain via `react-native-keychain` and attaches it as a `Bearer` token on each request. The existing sliding session renewal logic is replicated client-side, ensuring the system reuses all current `/api/auth` endpoints without any changes to the `AdminServer`. Role-based access is enforced client-side by inspecting the role claim in the decoded JWT, mirroring the web platform's approach; the submission screen is only reachable by authenticated `Contributors` or higher.

OAuth social sign-in (Google, GitHub, Discord) is layered on top of the same JWT model — after OAuth completion the server issues a standard JWT, and the mobile client stores and uses it identically to a password-based session.

### 3.4. Phased Approach

The implementation is structured into four distinct phases, ensuring a controlled path of change and progressive feature delivery. We order the phases to front-load the highest-risk work, specifically audio playback and authentication, guaranteeing core stability before moving to engagement and submission features. Each phase concludes with a clear exit criterion that verifies the delivered functionality.

#### 3.4.1. Phase 1 — Foundation *(Complete)*

Establish the project, get audio playing, and wire up authentication. Everything else depends on these two things working reliably.

- Initialize `React Native` project; configure build tooling for `iOS`
- Configure `iOS` Simulator for development testing
- Set up `TestFlight` for `iOS` pre-release distribution
- Verify background playback and lock screen controls on physical devices before closing the phase
- Implement sign-in and sign-out screens; `JWT` storage and request middleware
- Integrate `react-native-track-player`; connect to the live stream URL
- Basic play/stop UI
- Navigation shell: custom screen state managed in `App.tsx`

*Exit criterion: authenticated user can sign in, start the stream, lock a physical iOS device, and control playback from the lock screen.*

#### 3.4.2. Phase 2 — Core Listener Experience *(Complete)*

Phase 2 builds the core listener experience, focusing on the screens a listener will spend most of their time using. This phase surfaces the currently playing content, including the playlist and mix metadata.

- Playlist screen: current mix cover image, track list, mix metadata
- Sleep timer: user-set duration, auto-stop with fade-out

*Exit criterion: a listener can open the app, see what's playing, and set a sleep timer — without ever needing to sign in.*

#### 3.4.3. Phase 3 — Engagement and Submission *(Complete)*

Phase 3 integrates engagement and submission capabilities, which require user authentication and write access. This ensures that we defer work that relies on a stable authentication system until the core architecture is proven stable.

- Favorite/star a mix; persist to the existing favorites API
- Audio submission: file picker, upload form with cover image, classification chips, tag pills, copyright gate, progress feedback, error handling
- Contributor-gated navigation (submission screen hidden for Viewer role)
- iOS share target: audio files shared from Voice Memos, Files, and other apps open directly in the upload screen
- Profile screen: avatar, bio, stats, top played, recently played
- OAuth social sign-in: Google, GitHub, Discord

*Exit criterion: a contributor can submit an audio file from their phone; any listener can favorite a mix.*

#### 3.4.4. Phase 4 — Cast, Polish, and Release *(In Progress)*

Phase 4 prepares the application for submission to the Apple App Store by implementing Cast/AirPlay, focusing on final polish, and generating all required store assets.

- Google Cast integration: stream to Chromecast-compatible devices *(complete)*
- AirPlay integration: route audio to AirPlay receivers *(complete)*
- Cast discovery: starts at launch via `startDiscoveryAfterFirstTapOnCastButton = NO` in AppDelegate; iOS prompts for local network permission on first run
- Branding: app icon, splash screen, colors consistent with DriftConditions visual identity *(splash screen complete)*
- Platform-specific polish: safe areas, permission dialogs, offline/error states
- App store assets: screenshots, descriptions, metadata
- Submit to Apple App Store

*Exit criterion: app approved and live on the App Store.*

### 3.5. Cast and AirPlay Architecture

Cast and AirPlay were originally stretch goals. Both are now implemented and working. This section documents the architectural decisions made during implementation; several of these were non-obvious and required significant debugging.

#### 3.5.1. Google Cast

The Cast button lives in the More menu (`MoreModal.js`), rendered as a custom `TouchableOpacity` with an SVG icon. Tapping it calls `CastContext.showCastDialog()` to present the native Cast device picker.

**The Modal.onDismiss pattern.** The Cast picker cannot be presented while an RN `Modal` is still in the iOS view hierarchy. Calling `showCastDialog()` from inside `onClose` or `onPress` handlers fires before iOS has finished dismissing the modal, causing the picker to silently fail. The correct solution is `Modal.onDismiss`, an iOS-only lifecycle callback that fires after the modal is fully removed from the view hierarchy. The implementation uses a `castPendingRef` flag: the More menu sets the flag and closes itself; the `onDismiss` handler in `ControlBar.js` checks the flag and calls `showCastDialog()`.

**Session connect effect.** The `[castClient]` hook from `useRemoteMediaClient()` goes `null → client` on connect and `client → null` on disconnect. A single `useEffect` keyed on `[castClient]` fires exactly once per transition. When `castClient` becomes non-null, the effect pauses local playback and calls `castClient.loadMedia()` with the live stream URL.

**Live stream rules.** Live streams must always be stopped (never paused) because the buffer is gone after stop. They must always be reloaded via `loadMedia()` (never resumed via `play()`) because there is no buffered position to resume from. The `castToggle` function in `App.tsx` enforces this unconditionally.

**Custom receiver.** A custom Cast receiver is deployed at `https://driftconditions.org/cast/receiver.html`. It receives cover image and track list metadata via a custom Cast channel (`urn:x-cast:org.driftconditions.app`) and displays them on the Cast device screen.

**Cast App ID:** `2BC05BE5`

**AppDelegate initialization:**

```objc
GCKDiscoveryCriteria *criteria = [[GCKDiscoveryCriteria alloc]
    initWithApplicationID:@"2BC05BE5"];
GCKCastOptions *options = [[GCKCastOptions alloc]
    initWithDiscoveryCriteria:criteria];
options.startDiscoveryAfterFirstTapOnCastButton = NO;
[GCKCastContext setSharedInstanceWithOptions:options];
```

Setting `startDiscoveryAfterFirstTapOnCastButton = NO` causes Cast discovery to begin at native app launch, so devices are already known by the time the user opens the Cast picker.

#### 3.5.2. AirPlay

AirPlay is handled by a custom native module, `RNAirplayRouter`, implemented in `MobileApp/ios/MobileApp/RNAirplayRouter.h/.m`. Calling `NativeModules.RNAirplayRouter.showRoutePicker()` presents the iOS system audio route picker, which lists AirPlay receivers and Bluetooth devices. No third-party library is needed.

The AirPlay and Cast entries remain separate items in the More menu. This is the standard pattern in audio apps (Spotify, Pocket Casts) and reflects the fact that Cast and AirPlay use fundamentally different protocols and device ecosystems.

---

## 4. UI Specifications

### 4.1. Design Principles

The mobile UI strips away all administrative and editorial tooling, focusing exclusively on the core listener experience. The interface honors the ambient, generative nature of the stream by avoiding unnecessary visual noise. Screens are minimal, navigation is discoverable, and the persistent player ensures the stream never stops when moving between views.

The design echoes familiar patterns from podcast and music streaming apps (Pocket Casts, Apple Music, Spotify) while respecting the unique character of a generative, never-repeating audio source. There are no discrete "tracks" — only an ongoing stream with metadata about what's currently playing.

### 4.2. Persistent Elements

Two UI elements persist across all screens: the mini player bar and the control bar. These components ensure continuous playback and consistent access to core features regardless of which screen the user is viewing. A floating profile button appears in the top-right corner of the main screens.

#### 4.2.1. Mini Player Bar

The mini player appears at the bottom of all screens except the main player screen. It provides minimal playback information and a quick return path to the full player interface.

```
┌────────────────────────────────────────┐
│ [Cover]  Current track title...  ──── ▶ │
└────────────────────────────────────────┘
       Tap anywhere → Main Player
```

**Layout:**

- Small cover art thumbnail (left edge)
- Current track title (truncated)
- Progress bar
- Play/stop button (right edge)
- Tap anywhere on the bar → navigate to main player screen

**Behavior:**

- Hidden on the main player screen (that screen IS the player)
- Remains visible and interactive on all other screens
- Reflects current playback state (playing/stopped)

#### 4.2.2. Control Bar

The control bar appears below the mini player bar (or below the main player on the home screen) and provides access to all primary listener actions. It persists across every screen in the app.

```
┌──────────────────────────────────────────┐
│   ♡        ☽        ≡         …         │
│ Favorite  Sleep  Playlist    More        │
└──────────────────────────────────────────┘
             Persistent across all screens
```

**Layout (left to right):**

1. Favorite (heart icon)
2. Sleep timer (moon icon)
3. Playlist (list icon)
4. More (dot-dot-dot icon)

**Behavior:**

- Always visible at bottom of screen
- Icons update state visually: filled heart when favorited; moon shows countdown when timer is active; playlist icon highlights when on the playlist screen
- Sleep icon shows remaining minutes when a timer is active
- Tapping an icon triggers the associated action or navigates to the associated screen

#### 4.2.3. Profile Button

A floating circular button appears in the top-right corner of the main player, playlist, and upload screens. It shows the user's avatar when signed in, or a generic person icon when not. Tapping it opens a bottom sheet with Profile and Sign Out options (when signed in) or navigates to the login screen (when not).

### 4.3. Screens

#### 4.3.1. Main Player Screen

The main player is the default landing screen. It displays the currently playing content in a focused, immersive layout.

```
┌─────────────────────────────────┐
│                          [👤]  │  ← floating profile button
│                                 │
│   ┌─────────────────────────┐   │
│   │                         │   │
│   │    Large Cover Art      │   │
│   │    (rounded corners)    │   │
│   │                         │   │
│   └─────────────────────────┘   │
│                                 │
│   Current track title           │
│   abbreviated to fit one line   │
│                                 │
│              ▶                  │
│                                 │
│  ♡    ☽    ≡    …              │
└─────────────────────────────────┘
    No mini player — this IS the player
```

**Layout:**

- Large cover art with rounded corners (centered, occupies most of vertical space)
- Track title below cover art (abbreviated to fit one screen without scrolling)
- Large play/stop button below title
- Control bar at bottom
- "Casting to [device]" label below title when a Cast session is active, replacing the play/stop button with Cast-specific controls

**Behavior:**

- No mini player bar (this screen replaces it)
- Cover art and title update when the mix changes
- Play/stop button reflects current playback state

#### 4.3.2. Playlist Screen

The playlist screen displays a scrolling list of recent playlist entries, providing context for what's playing and what played before.

```
┌─────────────────────────────────┐
│  ≡ playlist                     │
│─────────────────────────────────│
│  4:15 PM  ♡  [■] Toji Playing…  │  ← currently playing
│  4:09 PM  ♡  [■] Wes - music…   │
│  3:59 PM  ♡  [■] Grumplefunk…   │
│  3:57 PM  ♡  [■] 03 Les Cartes… │
│─────────────────────────────────│
│ [Cover]  Toji Playing The…  ▶   │
│  ♡    ☽    ≡    …              │
└─────────────────────────────────┘
  Scrolling list • Now playing highlighted
  Mini player + controls persist
```

**Layout:**

- Scrolling list of entries, each showing: timestamp, heart button, small cover thumbnail, title
- Currently playing entry highlighted at top of list
- Mini player bar at bottom
- Control bar below mini player

**Behavior:**

- List scrolls independently; mini player and control bar remain fixed
- Tapping a heart on an entry favorites that mix
- Tapping an entry does nothing to playback (entries are informational only; the stream is continuous)

#### 4.3.3. Upload Screen

The upload screen allows contributors to submit audio files directly from their device. This screen is only accessible to users with Contributor role or higher. It also functions as the landing screen when audio files are shared to the app from Voice Memos, Files, or other apps.

**Layout:**

- File picker button
- Cover image picker (optional)
- Title text input field
- Classification chips (single select)
- Tag pills (multi-select)
- Copyright acknowledgment gate (must check before submit)
- Submit button
- Discard guard: confirmation dialog if navigating away with unsaved changes
- Mini player bar at bottom
- Control bar below mini player

**Behavior:**

- Screen is hidden or locked for users without Contributor role
- File picker opens device file browser
- Submit button uploads to existing `/api/audio` endpoint
- Progress feedback during upload
- Error handling for failed uploads
- When opened via iOS share sheet, the shared file is pre-filled in the file picker

#### 4.3.4. Profile Screen

The profile screen displays user information and engagement history.

**Layout:**

- User avatar (from profile image or generated placeholder)
- Display name
- Bio text
- Role badge
- Stats: total uploads, total favorites
- Top played clips list
- Recently played clips list
- Sign out button
- Mini player bar at bottom
- Control bar below mini player

**Behavior:**

- If not authenticated, the profile button opens the login screen instead
- Sign out clears stored JWT and returns to unauthenticated state

#### 4.3.5. Auth Screen

The auth screen provides the sign-in interface for unauthenticated users.

**Layout:**

- Email text input field
- Password text input field
- Sign in button
- OAuth buttons: Continue with Google, Continue with GitHub, Continue with Discord
- Forgot password link
- Mini player bar at bottom (if stream is playing)
- Control bar below mini player

**Behavior:**

- Successful sign-in stores JWT and navigates to main player or previous screen
- Error handling for invalid credentials
- Stream continues playing during sign-in process
- OAuth flows open an `ASWebAuthenticationSession` (via `react-native-inappbrowser-reborn`) for the provider authorization page; the server issues a JWT on completion and passes it back via URL redirect

### 4.4. Modals

Modals appear as overlays above the current screen, dimming the background content. They are dismissed by tapping outside the modal or using an explicit close/cancel action.

#### 4.4.1. Sleep Timer Modal

Triggered by tapping the moon icon in the control bar. Allows the user to set an auto-stop timer.

**Layout:**

- Modal title: "Sleep Timer"
- Preset buttons: 15 min, 30 min, 45 min, 60 min
- Cancel button (or cancel current timer if one is active)

**Behavior:**

- Tapping a preset sets the timer and closes the modal
- Moon icon in control bar updates to show countdown in minutes
- Stream fades out and stops when timer expires
- Cancel button closes modal; if a timer is active, cancels it

#### 4.4.2. More Menu Modal

Triggered by tapping the dot-dot-dot icon in the control bar. A bottom sheet that provides access to secondary features.

**Layout:**

- Sheet slides up from bottom of screen
- Menu items (vertical list):
  - Cast (SVG icon — always visible)
  - AirPlay (SVG icon — always visible)
  - Share (SVG icon — always visible)
  - Upload Audio (arrow icon — visible only to Contributors or higher)

**Behavior:**

- Tapping Cast: closes the modal, then presents the native Cast device picker via `CastContext.showCastDialog()`. The dialog is presented in the `Modal.onDismiss` callback (not during dismiss) to ensure the iOS view hierarchy is clear before the native picker appears. See §3.5.1 for the full technical explanation.
- Tapping AirPlay: closes the modal, then calls `RNAirplayRouter.showRoutePicker()` to present the iOS system audio route picker.
- Tapping Share: closes the modal, then invokes the system share sheet with the stream URL and current track title.
- Tapping Upload Audio: closes the modal and navigates to the upload screen.
- Tapping outside the modal closes it without action.

### 4.5. Discovery

Cast device discovery starts automatically at native app launch. This is configured in `AppDelegate.mm` with `startDiscoveryAfterFirstTapOnCastButton = NO`, which tells the Cast SDK to begin scanning the local network immediately rather than waiting for the user to tap a Cast button.

iOS will prompt the user for local network permission the first time discovery runs. The system dialog reads "DriftConditions would like to find and connect to devices on your local network." After the user responds, the decision is stored by iOS and the dialog never appears again.

When the user taps Cast in the More menu, `CastContext.showCastDialog()` presents the native Cast picker. Because discovery has been running since launch, the device list is already populated by the time the picker appears.

If the user denied local network permission at the iOS prompt, the picker will show no devices. The only recovery path is **Settings → DriftConditions → Local Network**.

---

## 8. Appendices

### 8.1. Key File Reference

| File | Purpose |
|---|---|
| `MobileApp/App.tsx` | Root component; Cast session state, metadata push, sleep timer |
| `MobileApp/src/components/ControlBar.js` | Persistent control bar; Cast pending ref; More modal host |
| `MobileApp/src/modals/MoreModal.js` | Cast, AirPlay, Share, Upload menu |
| `MobileApp/src/modals/SleepTimerModal.js` | Sleep timer preset sheet |
| `MobileApp/src/screens/PlayerScreen.js` | Main player: cover art, title, play/stop, Cast controls |
| `MobileApp/src/screens/PlaylistScreen.js` | Mix/clip history with timestamps and hearts |
| `MobileApp/src/screens/LoginScreen.js` | Auth: username/password + OAuth buttons |
| `MobileApp/src/screens/ProfileScreen.js` | Avatar, bio, stats, history |
| `MobileApp/src/screens/UploadScreen.js` | Audio submission form; iOS share target |
| `MobileApp/ios/MobileApp/AppDelegate.mm` | Cast SDK initialization; `startDiscoveryAfterFirstTapOnCastButton` |
| `MobileApp/ios/MobileApp/RNAirplayRouter.h/.m` | Custom AirPlay native module |
| `MobileApp/ios/MobileApp/Info.plist` | URL schemes, Bonjour services, permissions |
| `MobileApp/ios/Podfile.lock` | Cast SDK pinned to 4.7.1 |
| `AdminClient/public/cast/receiver.html` | Custom Cast receiver (deployed to production) |
| `graphic/` | Source SVGs: `google-cast-mono.svg`, `airplay-video.svg`, `share.svg` |

### 8.2. Known Constraints and Pitfalls

- **Do not upgrade `react-native-google-cast` past 4.6.1** or `google-cast-sdk` past 4.7.1. The 4.8.x native SDK has a confirmed iOS device discovery regression where Cast devices are never found on real hardware.
- **Do not call `CastContext.showCastDialog()` while an RN Modal is still mounted.** Use `Modal.onDismiss` (iOS only) to guarantee the view hierarchy is clear before presenting the native picker.
- **Live streams must be stopped, not paused.** The Cast SDK's `play()` and `pause()` methods are for VOD. For live streams, always call `stop()` and then `loadMedia()` — never `pause()` or `play()`.
- **`react-native-track-player` 4.1.2 breaks on React Native 0.74+.** The project is pinned to RN 0.73.6. Do not upgrade React Native without verifying track player compatibility first.
- **Do not chain `cd` and `npx` commands on the same line** in terminal instructions. Metro and other RN tools produce no output when invoked this way.
- **Cast on the iOS simulator does not discover real Cast devices.** All Cast testing must be done on a physical iPhone connected to the same local network as the Cast device.
