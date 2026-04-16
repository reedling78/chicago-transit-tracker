---
name: build-mobile
description: Use when the user wants to build and deploy the mobile app. Supports iOS simulator, Android emulator, and Firebase App Distribution. Trigger phrases — "/build-mobile", "build the app", "deploy to testers", "run on simulator", "build ios", "build android".
---

# Build Mobile

Build the Expo mobile app locally or via EAS, then deploy to a simulator/emulator or Firebase App Distribution.

**Invocation:** `/build-mobile`

---

## Step 1: Ask the user

If not already specified, present these four options and ask the user to pick one:

1. **iOS → Simulator** (local dev build, free)
2. **iOS → Firebase App Distribution** (EAS cloud build, distributes to testers)
3. **Android → Emulator** (local dev build, free)
4. **Android → Firebase App Distribution** (EAS cloud build, distributes to testers)

---

## Step 2: Build and deploy

Follow the path matching the user's answers:

### iOS → Simulator

Verify a simulator is booted:

```bash
xcrun simctl list devices booted
```

If none, open one:

```bash
open -a Simulator
```

Build and install:

```bash
cd apps/mobile && npx expo run:ios
```

This builds locally via Xcode, installs the `.app` on the booted simulator, and launches it. No EAS cloud builds, no charges.

**Expected duration:** 2-5 min clean build, ~30s incremental.

### Android → Emulator

Verify an emulator is running:

```bash
adb devices
```

If none, the user needs to start one from Android Studio.

Build and install:

```bash
cd apps/mobile && npx expo run:android
```

This builds locally via Gradle, installs the APK on the connected emulator, and launches it.

**Expected duration:** 3-7 min clean build, ~1 min incremental.

### iOS → Firebase App Distribution

```bash
cd apps/mobile && pnpm run distribute:ios
```

This runs the full pipeline:
1. Builds via EAS cloud (`eas build --profile preview --platform ios`)
2. Downloads the `.ipa` artifact
3. Uploads to Firebase App Distribution (group: `internal`)
4. Release notes are pulled from the latest git commit message

**Requires:** `apps/mobile/.env.local` with `FIREBASE_APP_ID_IOS` set.

### Android → Firebase App Distribution

```bash
cd apps/mobile && pnpm run distribute:android
```

Same pipeline as iOS:
1. Builds via EAS cloud (`eas build --profile preview --platform android`)
2. Downloads the `.apk` artifact
3. Uploads to Firebase App Distribution (group: `internal`)

**Requires:** `apps/mobile/.env.local` with `FIREBASE_APP_ID_ANDROID` set.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| No simulator booted | `open -a Simulator` |
| No Android emulator | Start one from Android Studio |
| Pod install needed | `cd apps/mobile/ios && pod install` then retry |
| Build fails on signing | Simulator builds don't need signing |
| Metro bundler conflict | `lsof -ti:8081 \| xargs kill -9` then retry |
| Missing Firebase app ID | Set `FIREBASE_APP_ID_IOS` or `FIREBASE_APP_ID_ANDROID` in `apps/mobile/.env.local` |
| EAS build fails | Check `eas build:list` for error details |

---

## Notes

- Simulator/emulator builds are **debug** builds — free, fast, local only.
- Distribution builds use **EAS cloud** (preview profile) — counts against your EAS build quota.
- The native `ios/` directory must exist for local iOS builds. If missing: `npx expo prebuild --platform ios`.
