# Auto-bump mobile version + build number on every Firebase distribution

> Once approved, rename to `docs/superpowers/plans/2026-04-25-mobile-version-bump.md`.

## Context

Both Firebase App Distribution releases for the mobile app currently read `1.0.0 (1)` in the console — they're visually indistinguishable, so testers can't tell which build they're installing. Looking at the moving parts:

- `apps/mobile/app.json` only sets the top-level `version` ("1.0.0"); neither `ios.buildNumber` nor `android.versionCode` are present, so EAS falls back to its implicit default of `1` for both.
- `apps/mobile/eas.json`'s `preview` profile has no `autoIncrement` field.
- `apps/mobile/scripts/distribute.mjs` does build → download artifact → upload to Firebase. It never modifies version fields.

Every `pnpm run distribute:ios|android` therefore ships the same "1.0.0 (1)" string, which lands as a duplicate-looking row on the Firebase console and would also be rejected by App Store / TestFlight if we ever uploaded there (those require unique `(version, buildNumber)` pairs).

**Confirmed scope (user-selected):** patch-bump the version string AND increment the iOS `buildNumber` + Android `versionCode` together on each distribute. Console will go `1.0.0 (1)` → `1.0.1 (2)` → `1.0.2 (3)`. The first new distribute after this lands as `1.0.1 (2)`.

## Approach

### Step 1 — Extend `apps/mobile/app.json` with explicit build-number fields

Add the two missing fields, seeded at the values that EAS has been implicitly using for prior builds, so the first auto-bump cleanly increments to `2`.

```jsonc
{
  "expo": {
    "name": "Chicago Transit Tracker",
    "slug": "chicago-transit-tracker",
    "version": "1.0.0",
    // ...
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.chicagotransittracker.app",
      "buildNumber": "1",          // ← new, seeded at 1
      "infoPlist": { /* ... */ }
    },
    "android": {
      "package": "com.chicagotransittracker.app",
      "versionCode": 1              // ← new, seeded at 1
    }
  }
}
```

### Step 2 — New script `apps/mobile/scripts/bump-version.mjs`

Reads `app.json`, applies the bump, writes it back, and (when run on a clean working tree apart from `app.json`) auto-commits just that file with a clear chore message.

Behavior:
1. Parse `app.json`.
2. Increment patch component of `expo.version` (`a.b.c` → `a.b.(c+1)`).
3. Increment `expo.ios.buildNumber` (treat as integer string, ++).
4. Increment `expo.android.versionCode` (integer, ++).
5. Write `app.json` back, preserving formatting (2-space indent, trailing newline) — match what Prettier produces so the diff is purely the numbers.
6. Git-commit *only* `apps/mobile/app.json` with message `chore(mobile): bump to <version> (<buildNumber>)`. The commit step uses an explicit pathspec (`git add apps/mobile/app.json && git commit -- apps/mobile/app.json`) so unrelated dirty files in the working tree are never folded in.
7. Honor a `--no-commit` flag for callers that want to bump without committing (used by the combined `distribute` script — see Step 3).

The pure bump logic is exported from a small helper so we can unit-test without filesystem I/O:

```js
// apps/mobile/scripts/bump-version.lib.mjs
export function bumpExpoConfig(config) {
  const next = structuredClone(config)
  const [major, minor, patch] = next.expo.version.split('.').map(Number)
  next.expo.version = `${major}.${minor}.${patch + 1}`
  const buildNumber = String(Number(next.expo.ios.buildNumber) + 1)
  next.expo.ios.buildNumber = buildNumber
  next.expo.android.versionCode = Number(next.expo.android.versionCode) + 1
  return next
}
```

`bump-version.mjs` becomes a thin shell: read file → call `bumpExpoConfig` → write file → optional commit.

### Step 3 — Wire `package.json` scripts so each distribute path bumps exactly once

Currently:

```json
"distribute:ios": "node --env-file=.env.local ./scripts/distribute.mjs ios",
"distribute:android": "node --env-file=.env.local ./scripts/distribute.mjs android",
"distribute": "pnpm run distribute:android && pnpm run distribute:ios",
```

After:

```json
"bump": "node ./scripts/bump-version.mjs",
"distribute:ios": "pnpm run bump && node --env-file=.env.local ./scripts/distribute.mjs ios",
"distribute:android": "pnpm run bump && node --env-file=.env.local ./scripts/distribute.mjs android",
"distribute": "pnpm run bump && node --env-file=.env.local ./scripts/distribute.mjs android && node --env-file=.env.local ./scripts/distribute.mjs ios"
```

Notes:
- A platform-only run (`distribute:ios` or `distribute:android`) bumps once.
- The combined `distribute` bumps **once** (in the parent script) and runs each platform's `distribute.mjs` directly, so iOS and Android ship with the same `(version, buildNumber)` pair.
- `distribute.mjs` itself is unchanged — bumping is the parent script's responsibility.

### Step 4 — Update `.claude/skills/build-mobile/SKILL.md`

Add a one-line note under each Firebase distribution path explaining the auto-bump. No structural changes to the skill.

> The script auto-bumps `apps/mobile/app.json`'s `version` (patch) and the platform `buildNumber` / `versionCode` before the EAS build starts, then commits that file. Each distribute run produces a uniquely-numbered release on Firebase.

Also add a "Manual version bumps" troubleshooting row noting that minor/major releases are still hand-edited in `app.json`, and that distribute bumps from whatever's currently in `app.json` — so editing `version` to `"1.1.0"` and then running `distribute:ios` ships `1.1.1 (next)`.

### Step 5 — Tests

`apps/mobile/__tests__/scripts/bump-version.test.ts` (or `.mjs` if simpler given the script is plain ESM):

- Increments patch from `1.0.0` → `1.0.1`, `1.2.9` → `1.2.10`.
- Increments iOS `buildNumber` (a string) from `"1"` → `"2"`.
- Increments Android `versionCode` (integer) from `1` → `2`.
- Preserves all other fields verbatim (deep-equality on the rest of the config).
- Throws clearly when `version` is malformed (e.g. `"v1.0"`, missing fields).

The thin file-I/O wrapper isn't unit-tested — it's small, and the integration is verified by the manual walkthrough below.

## Critical files

| Path | Action |
|---|---|
| `apps/mobile/app.json` | modify (add `ios.buildNumber: "1"`, `android.versionCode: 1`) |
| `apps/mobile/scripts/bump-version.mjs` | **create** (file-I/O + commit wrapper) |
| `apps/mobile/scripts/bump-version.lib.mjs` | **create** (pure `bumpExpoConfig`) |
| `apps/mobile/scripts/distribute.mjs` | unchanged |
| `apps/mobile/package.json` | modify (add `bump` script; chain into distribute scripts) |
| `apps/mobile/__tests__/scripts/bump-version.test.ts` | **create** |
| `.claude/skills/build-mobile/SKILL.md` | modify (note auto-bump on Firebase distribution paths) |

## Reuse & non-touched code

- `apps/mobile/scripts/distribute.mjs` stays untouched — the bump is a separate concern, chained via `package.json`. No risk to the existing build/upload pipeline.
- Existing unit-test setup (`jest-expo`) handles pure-function tests with no extra config; the new test fits the pattern in `apps/mobile/__tests__/`.

## Verification

1. **Tests:** `cd apps/mobile && pnpm test bump-version` — pure-function bump cases pass.
2. **Workspace sanity:** `pnpm -w run test && pnpm -w run lint` — green.
3. **Manual dry run** (no actual EAS spend):
   - Note the current `version`, `ios.buildNumber`, `android.versionCode` in `apps/mobile/app.json`.
   - Run `cd apps/mobile && pnpm run bump`.
   - Confirm `app.json` advanced by exactly +1 in all three places.
   - Confirm `git log -1` shows `chore(mobile): bump to 1.0.1 (2)`.
   - Confirm `git status` shows a clean tree (the bump committed only `apps/mobile/app.json`).
4. **End-to-end** (next real distribution):
   - Run `pnpm run distribute:ios` from `apps/mobile/`.
   - When the build finishes, the Firebase App Distribution console should show a new row labeled `1.0.1 (2)` — distinguishable from the existing `1.0.0 (1)` rows.

## Failure handling

If a distribute fails *after* the bump commit lands (e.g. EAS build error), the commit is harmless — re-running the distribute will bump again and ship `1.0.2 (3)`. If the user wants to undo, `git reset --hard HEAD~1` rolls the bump back. Documented in the skill's troubleshooting table.

## Out of scope

- EAS-side `autoIncrement` (would bump remotely; values wouldn't reflect in `app.json` so we wouldn't have an auditable git trail).
- Tagging git on each distribute (`v1.0.1`, …). Easy to add later as a one-line addition to the bump script.
- Pushing the bump commit. Stays a manual step — a distribute shouldn't silently push to a remote branch.
