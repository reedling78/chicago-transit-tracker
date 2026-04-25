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
1. **Auto-bumps `apps/mobile/app.json`** — patch-bumps `version` and increments `ios.buildNumber` + `android.versionCode` together, then commits only that file with `chore(mobile): bump to <version> (<buildNumber>)`. Each distribution lands as a uniquely-numbered row on Firebase (e.g. `1.0.1 (2)`, `1.0.2 (3)`).
2. Builds via EAS cloud (`eas build --profile preview --platform ios`)
3. Downloads the `.ipa` artifact
4. Uploads to Firebase App Distribution (group: `internal`)
5. Release notes are pulled from the latest git commit message

**Requires:** `apps/mobile/.env.local` with `FIREBASE_APP_ID_IOS` set.

### Android → Firebase App Distribution

```bash
cd apps/mobile && pnpm run distribute:android
```

Same pipeline as iOS (including the version + build number auto-bump in step 1):
1. Auto-bumps and commits `apps/mobile/app.json` (see iOS path).
2. Builds via EAS cloud (`eas build --profile preview --platform android`)
3. Downloads the `.apk` artifact
4. Uploads to Firebase App Distribution (group: `internal`)

**Requires:** `apps/mobile/.env.local` with `FIREBASE_APP_ID_ANDROID` set.

### Both platforms in one command

```bash
cd apps/mobile && pnpm run distribute
```

Bumps **once** (so iOS and Android ship with the same `(version, buildNumber)` pair), then runs Android followed by iOS.

### Bumping versions manually

The auto-bump always increments the patch component. For minor/major releases, edit `apps/mobile/app.json`'s `version` directly (e.g. `"1.0.0"` → `"1.1.0"`), commit, and the next `distribute:*` run will bump from there (`"1.1.0"` → `"1.1.1"`).

To bump without distributing (e.g. to test the script locally):

```bash
cd apps/mobile && pnpm run bump
```

Add `--no-commit` (`node ./scripts/bump-version.mjs --no-commit`) to leave `app.json` dirty without creating a commit.

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
| Distribute failed *after* the bump commit landed | The `chore(mobile): bump to …` commit is harmless. Either re-run distribute (next attempt patch-bumps further), or `git reset --hard HEAD~1` to undo the bump. |
| Want to roll the version back | Edit `apps/mobile/app.json` and revert the three fields manually, or `git revert` the bump commit. |

---

## Notes

- Simulator/emulator builds are **debug** builds — free, fast, local only.
- Distribution builds use **EAS cloud** (preview profile) — counts against your EAS build quota.
- The native `ios/` directory must exist for local iOS builds. If missing: `npx expo prebuild --platform ios`.
