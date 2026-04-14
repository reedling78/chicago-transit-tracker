# Firebase App Distribution for Mobile App — Implementation Plan

## Context

The Expo mobile app in [apps/mobile/](apps/mobile/) has no beta distribution pipeline. `eas.json` defines `development`, `preview`, and `production` profiles but there's no EAS project link, no tester channel, and `deploy.yml` explicitly excludes mobile. Goal: ship internal builds to testers (initially just the user) via **Firebase App Distribution** for iOS and Android, triggered manually from the developer's machine.

**User decisions from brainstorming:**

- Apple Developer Program: enrolled (iOS ad-hoc distribution viable)
- Build flow: **EAS Build + Firebase CLI upload**
- Trigger: **manual local command** (no CI yet)
- Testers: **just the user** — one `internal` group in the Firebase Console

**Out of scope:**

- Native Firebase SDK (Crashlytics, FCM, Analytics) — App Distribution doesn't need them; the mobile app intentionally uses the Firebase JS SDK
- `google-services.json` / `GoogleService-Info.plist`
- GitHub Actions / CI-driven distribution
- Production store submission via `eas submit`

---

## Prerequisites (one-time manual setup by user)

1. **Firebase Console → Project settings → Your apps**
   - Add **Android app**: package `com.chicagotransittracker.app`. Copy **Firebase App ID** (`1:NNNN:android:HEX`). Skip the google-services.json download.
   - Add **iOS app**: bundle `com.chicagotransittracker.app`. Copy **Firebase App ID** (`1:NNNN:ios:HEX`). Skip the GoogleService-Info.plist download.
2. **Firebase Console → App Distribution → Testers & Groups** — create group alias `internal`, add the user's email.
3. **EAS / Expo** — `eas-cli` installed, `eas login` complete.
4. **Apple Developer Portal** — handled automatically; on first iOS `preview` build EAS prompts for `eas device:create` to register the iPhone UDID.

---

## Implementation Steps

### Step 1 — Link the Expo app to an EAS project

**File:** [apps/mobile/app.json](apps/mobile/app.json)

Run `cd apps/mobile && eas init`. Writes `expo.extra.eas.projectId` into `app.json`. Commit — safe to be public.

**Verification:** `app.json` has `extra.eas.projectId`; `eas build:list` runs without a "no project" error.

---

### Step 2 — Tune `eas.json` `preview` profile

**File:** [apps/mobile/eas.json](apps/mobile/eas.json)

Ensure `preview` produces App Distribution-compatible artifacts:

```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "android": { "buildType": "apk" },
      "ios": { "simulator": false }
    }
  }
}
```

- `android.buildType: "apk"` — installs directly on devices via App Distribution
- `ios.simulator: false` — produces a device-installable IPA with ad-hoc provisioning

Keep `development` and `production` untouched.

**Verification:** `eas build --profile preview --platform android` and `--platform ios` each complete and produce downloadable artifacts.

---

### Step 3 — Add distribution scripts

**File:** [apps/mobile/package.json](apps/mobile/package.json)

Add under `"scripts"`:

```json
{
  "build:android": "eas build --profile preview --platform android --non-interactive",
  "build:ios": "eas build --profile preview --platform ios --non-interactive",
  "distribute:android": "node --env-file=.env.local ./scripts/distribute.mjs android",
  "distribute:ios": "node --env-file=.env.local ./scripts/distribute.mjs ios",
  "distribute": "pnpm run distribute:android && pnpm run distribute:ios"
}
```

---

### Step 4 — Write the distribute helper script

**New file:** `apps/mobile/scripts/distribute.mjs` (~60 lines)

1. Reads platform from `argv[2]` (`ios` or `android`)
2. Reads `FIREBASE_APP_ID_ANDROID` / `FIREBASE_APP_ID_IOS` from env; fails fast with a clear error if missing
3. Runs `eas build --profile preview --platform <p> --non-interactive --json` to build and parse the resulting artifact URL
4. Downloads the artifact to `apps/mobile/.artifacts/<platform>-latest.<apk|ipa>` (gitignored)
5. Uses `git log -1 --pretty=%B HEAD` as release notes
6. Runs `firebase appdistribution:distribute <file> --app <app-id> --groups internal --release-notes "<notes>"`
7. Prints the Firebase Console release URL on success

Dependencies: `node:fs`, `node:child_process`, built-in `fetch` (Node 20+).

**File:** [apps/mobile/.gitignore](apps/mobile/.gitignore) — add `.artifacts/`, verify `.env*.local` is excluded.

---

### Step 5 — Env var documentation

**New file:** `apps/mobile/.env.example`

```bash
# Firebase App Distribution — App IDs from Firebase Console → Project settings
# Format: 1:PROJECT_NUMBER:android:HEX  /  1:PROJECT_NUMBER:ios:HEX
FIREBASE_APP_ID_ANDROID=
FIREBASE_APP_ID_IOS=
```

User creates `apps/mobile/.env.local` with real values. Scripts load it via `node --env-file=.env.local` (no dotenv dep).

---

### Step 6 — Firebase CLI auth check

`firebase-cli` is already installed and authenticated (web deploys work). Confirm `firebase appdistribution:distribute --help` works and the authenticated user has **App Distribution Admin** role on the project. No code changes.

---

### Step 7 — Documentation

**New file:** `apps/mobile/README.md` (<80 lines)

- Running locally (`npx expo start`)
- Shipping a build (`pnpm run distribute:android` / `distribute:ios` / `distribute`)
- Managing testers (Firebase Console → App Distribution → `internal`)
- First-time iOS device registration (EAS prompt → `eas device:create`)
- Pointer to `.env.example`

Update [CLAUDE.md](CLAUDE.md) Commands section — add a "Mobile distribution" subsection with the new `pnpm run distribute` commands.

---

## Critical Files

| Path | Change type |
| --- | --- |
| [apps/mobile/app.json](apps/mobile/app.json) | Modified — add EAS projectId via `eas init` |
| [apps/mobile/eas.json](apps/mobile/eas.json) | Modified — tune `preview` profile |
| [apps/mobile/package.json](apps/mobile/package.json) | Modified — add build/distribute scripts |
| `apps/mobile/scripts/distribute.mjs` | **New** — ~60-line helper |
| `apps/mobile/.env.example` | **New** — documents env vars |
| [apps/mobile/.gitignore](apps/mobile/.gitignore) | Modified — add `.artifacts/`, verify `.env*.local` |
| `apps/mobile/README.md` | **New** — dev docs |
| [CLAUDE.md](CLAUDE.md) | Modified — add mobile distribution commands |

**Not touched:** `firebase.json`, `apps/web/*`, `.github/workflows/*`, `apps/functions/*`, `packages/shared/*`, `apps/mobile/lib/firebase.ts`.

---

## Testing / Verification

Manual end-to-end (no automated tests — build pipeline):

1. `cd apps/mobile && cat app.json | grep projectId` shows a non-empty value
2. **Android:** `pnpm --filter mobile run distribute:android` → EAS shows finished build → Firebase Console → App Distribution → Releases shows new Android build with `internal` group → tester email arrives → install on Android device
3. **iOS:** first run prompts for `eas device:create` (register iPhone UDID) → `pnpm --filter mobile run distribute:ios` → ad-hoc IPA produced → Firebase Console shows iOS release → install on registered iPhone via invite email
4. `pnpm --filter mobile run distribute` runs both in sequence without errors
5. Unset `FIREBASE_APP_ID_ANDROID` → `distribute.mjs` fails fast with a clear error
6. `git check-ignore apps/mobile/.env.local` confirms it's gitignored
7. `pnpm -w run lint` stays clean

---

## Open Questions / Future Work

- **CI:** a GitHub Action on tag push (`mobile-v*`) can reuse `distribute.mjs` with `FIREBASE_TOKEN` + `EXPO_TOKEN` secrets. Deferred.
- **Release notes:** `git log -1` default is fine to start; a `--notes` flag can be added later.
- **Store submission:** `eas submit` for TestFlight / Play Internal Testing is a separate pipeline.
