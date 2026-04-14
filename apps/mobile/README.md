# @ctt/mobile

React Native Expo app for Chicago Transit Tracker. Replicates the web experience on iOS and Android.

## Development

```bash
npx expo start            # Start Metro bundler
npx expo run:ios          # Build and run on iOS simulator
npx expo run:android      # Build and run on Android emulator
```

## Key directories

- `app/` — expo-router file-based routes (home, CTA/Metra line lists, line detail, station detail)
- `components/` — Reusable React Native components (ScheduleTable, etc.)
- `lib/` — Firebase JS SDK init, Firestore data hooks

## Architecture

- Uses **Firebase JS SDK** (not Admin SDK) for client-side Firestore reads
- Shares types, constants, and pure helpers from `@ctt/shared`
- Styling via `StyleSheet.create` with CTA branding colors from shared constants
- Navigation via expo-router (file-based Stack navigator)

## v1 Scope

Read-only browse: home, CTA/Metra line lists, line detail, station detail with schedules. Realtime alerts, maps, and push notifications are planned for future versions.

## Shipping internal builds via Firebase App Distribution

Internal builds are produced by [EAS Build](https://docs.expo.dev/build/introduction/) and uploaded to [Firebase App Distribution](https://firebase.google.com/docs/app-distribution), where registered testers get an email invite and install directly on device.

### One-time setup

1. **Register mobile apps in Firebase.** Firebase Console → Project settings → Your apps — add an Android app with package `com.chicagotransittracker.app` and an iOS app with bundle ID `com.chicagotransittracker.app`. Copy each **App ID** (format: `1:PROJECT_NUMBER:android:HEX`). Skip the google-services.json / GoogleService-Info.plist downloads — App Distribution alone does not need them.
2. **Create a testers group.** Firebase Console → App Distribution → Testers & Groups — create a group aliased `internal` and add tester emails.
3. **Env vars.** Copy `.env.example` to `.env.local` and fill in both App IDs:
   ```bash
   cp apps/mobile/.env.example apps/mobile/.env.local
   ```
4. **Link EAS project.** From `apps/mobile/`, run `eas init`. This writes `expo.extra.eas.projectId` into `app.json`. Commit the change.
5. **Firebase CLI auth.** The `firebase` CLI is already authenticated for web deploys. Confirm `firebase appdistribution:distribute --help` works. The logged-in user needs the **App Distribution Admin** role on the project.

### Distributing a build

```bash
pnpm --filter mobile run distribute:android   # Android only
pnpm --filter mobile run distribute:ios       # iOS only
pnpm --filter mobile run distribute           # Both, sequential
```

Each command runs `eas build --profile preview --platform <p>`, downloads the finished artifact to `apps/mobile/.artifacts/` (gitignored), uses the most recent git commit message as release notes, and uploads to Firebase App Distribution for the `internal` group.

### First iOS build — device registration

The first time you run `distribute:ios`, EAS prompts you to register your iPhone's UDID via `eas device:create` and generates an ad-hoc provisioning profile. Any device not in that profile cannot install the resulting IPA — re-run `eas device:create` to add new tester devices.

### Managing testers

Tester groups live entirely in the Firebase Console → App Distribution → Testers & Groups. `distribute.mjs` always uploads to the `internal` group; add or remove members there.
