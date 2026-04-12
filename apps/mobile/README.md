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
