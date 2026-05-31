# DriftConditions Mobile App

React Native app at `MobileApp/`. Targets iOS (primary) and Android.

---

## Prerequisites

### macOS tools

```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Node.js (v18+), Watchman
brew install node watchman

# CocoaPods (iOS dependency manager)
sudo gem install cocoapods
```

### Xcode (iOS)

1. Install **Xcode** from the Mac App Store (tested with Xcode 26.5)
2. Open Xcode → Settings → Components → install **iOS 26.5 simulator**
3. Install command-line tools:
   ```bash
   xcode-select --install
   ```
4. Accept the license:
   ```bash
   sudo xcodebuild -license accept
   ```

### Android Studio (Android)

1. Download and install [Android Studio](https://developer.android.com/studio)
2. During setup, install: Android SDK, Android SDK Platform, Android Virtual Device
3. In Device Manager, create a **Pixel 9** emulator, API 37
4. Add to your shell profile (`~/.zshrc` or `~/.bash_profile`):
   ```bash
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```
5. Reload your shell: `source ~/.zshrc`

> **Note:** Audio playback does not work in the Android emulator on Apple Silicon (QEMU limitation). Use a physical device for audio testing on Android.

---

## First-time setup

```bash
cd MobileApp

# Install JS dependencies
npm install

# Install iOS native dependencies
cd ios && pod install && cd ..
```

---

## Running the app

Metro must be running before launching on either platform. Use **separate terminal tabs** — do not chain commands with `&&`.

### Terminal 1 — Metro bundler (keep this running)

```bash
cd MobileApp
npx react-native start --port 8084
```

- Port 8084 is required — 8081 is taken by AdminServer, 8082 by MixEngine proxy
- Press `r` in this terminal to reload the JS bundle without a full rebuild
- Press `d` to open the developer menu in the simulator

### Terminal 2 — iOS simulator

```bash
cd MobileApp
npx react-native run-ios --port 8084 --simulator "iPhone 17"
```

- First build takes a few minutes; subsequent runs are much faster
- JS changes hot-reload instantly via Metro — no rebuild needed
- Native changes (Info.plist, new packages, pod installs) require a full rebuild

### Terminal 2 (alternative) — Android emulator

Start the Pixel 9 emulator first via Android Studio → Device Manager → play button, then:

```bash
cd MobileApp
npx react-native run-android --port 8084
```

---

## After installing a new package

```bash
cd MobileApp
npm install <package> --legacy-peer-deps

cd ios && pod install && cd ..
```

Then do a full rebuild (`npx react-native run-ios --port 8084 --simulator "iPhone 17"`).

---

## Stale Metro / port conflicts

If you see `EADDRINUSE :::8081`, Metro started on the wrong port or a stale process is running:

```bash
# Kill whatever is on 8081
kill $(lsof -ti:8081) 2>/dev/null

# Kill stale Metro on 8084
kill $(lsof -ti:8084) 2>/dev/null
```

Then restart Metro with `--port 8084`.

---

## Running on a physical iPhone

1. Plug iPhone into Mac via USB
2. Open `MobileApp/ios/MobileApp.xcworkspace` in Xcode
3. Select your device from the device dropdown (top left)
4. Xcode → Signing & Capabilities → set Team to your Apple ID
5. Click Run (▶)

Re-sign required every 7 days with a free Apple account.

---

## Key version pins — do not upgrade without research

| Package | Version | Why pinned |
|---|---|---|
| `react-native` | 0.73.6 | react-native-track-player 4.1.2 breaks on 0.74+ |
| `react-native-track-player` | 4.1.2 | TurboModule crash on RN 0.74+ |
| `react-native-screens` | 3.29.0 | 3.30+ requires RN 0.82+ |

---

## Project structure

```
MobileApp/
  App.tsx                        # Root — screen routing, sleep timer, auth nav
  src/
    config.js                    # API base URLs, stream URL
    context/
      AuthContext.js             # Auth state, signIn, oauthSignIn, signOut
      PlayerContext.js           # TrackPlayer setup, playback, playlist polling
    screens/
      PlayerScreen.js            # Main player (cover art, play button)
      PlaylistScreen.js          # Scrollable clip/mix history
      LoginScreen.js             # Username/password + OAuth (Google, GitHub, Discord)
      ForgotPasswordScreen.js    # Password reset request
      ProfileScreen.js           # User profile, stats, top played
      UploadScreen.js            # Audio upload form
    modals/
      MoreModal.js               # Bottom sheet (Share, Upload, Profile, Sign Out)
      SleepTimerModal.js         # Sleep timer presets
    components/
      ControlBar.js              # Bottom nav (Favorite, Sleep, Playlist, More)
      MiniPlayerBar.js           # Compact player bar on non-player screens
    services/
      playerService.js           # Background audio handler (must use require())
    utils/
      authUtils.js               # Keychain token storage, signIn, checkAuth
      heartUtils.js              # Favorite/heart API calls
  ios/
    MobileApp/Info.plist         # URL schemes, document types, fonts, permissions
```

---

## API endpoints (production)

| Purpose | URL |
|---|---|
| Auth, upload, profile | `https://driftconditions.org:8080` (AdminServer via Caddy) |
| Playlist, heart | `https://driftconditions.org:8082` (MixEngine via Caddy) |
| Stream | `https://usa14.fastcast4u.com/proxy/wmodes?mp=/1` |
