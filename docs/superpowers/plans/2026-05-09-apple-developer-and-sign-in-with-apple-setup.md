# Apple Developer + Sign in with Apple Setup

## Context

Two related goals, one PR:

1. **Unblock `pnpm run:ios`.** It currently fails with `No code signing certificates are available to use.` This Mac has zero code-signing identities (`security find-identity -v -p codesigning` → `0 valid identities found`). Even though we'd like to target the booted simulator, [@expo/cli's simulator code-signing gate](apps/mobile/node_modules/@expo/cli/build/src/run/ios/codeSigning/simulatorCodeSigning.js) requires a signing identity whenever the project's entitlements include `com.apple.developer.applesignin` — which ours does, in [ChicagoTransitTracker.entitlements](apps/mobile/ios/ChicagoTransitTracker/ChicagoTransitTracker.entitlements).
2. **Wire Sign in with Apple end-to-end** on iOS (native), web (Firebase popup), and Android (web-based via Firebase). The code paths already exist in [apps/mobile/lib/auth.ts](apps/mobile/lib/auth.ts) and [apps/web/app/lib/auth.ts](apps/web/app/lib/auth.ts) but are dead — no App ID / Service ID / Apple key has been registered, and Firebase's Apple provider isn't enabled.

The user has a paid Apple Developer Program account, so we have access to App IDs, Service IDs, and Sign-in-with-Apple keys.

**Out of scope:** App Store Connect listing, TestFlight, EAS submission to App Store. Those are a separate later effort.

---

## Existing state (verified)

- `bundleIdentifier` = `com.chicagotransittracker.app` ([apps/mobile/app.json](apps/mobile/app.json))
- `usesAppleSignIn: true` ([apps/mobile/app.json](apps/mobile/app.json))
- Plugin `expo-apple-authentication` registered ([apps/mobile/app.json](apps/mobile/app.json))
- Entitlements file declares `com.apple.developer.applesignin` ([apps/mobile/ios/ChicagoTransitTracker/ChicagoTransitTracker.entitlements](apps/mobile/ios/ChicagoTransitTracker/ChicagoTransitTracker.entitlements))
- Firebase project ID = `chicago-transit-tracker` ([apps/mobile/lib/firebase.ts:9](apps/mobile/lib/firebase.ts))
- Firebase auth domain = `chicago-transit-tracker.firebaseapp.com` (the Apple OAuth callback URL we'll register lives at this domain)
- Mobile Apple sign-in code uses `expo-apple-authentication` (iOS-only) — see [apps/mobile/lib/auth.ts:44-62](apps/mobile/lib/auth.ts)
- Web Apple sign-in code uses Firebase popup — see [apps/web/app/lib/auth.ts:33-34](apps/web/app/lib/auth.ts)

---

## Step 1 — Apple Developer Console (developer.apple.com)

Three artifacts get created. Note all three IDs/values down before moving on; we'll need them in Step 3.

### 1a. App ID (already may exist if you've built before via EAS)

1. Go to **Certificates, Identifiers & Profiles → Identifiers → +**.
2. Type **App IDs** → **App** → bundle ID = `com.chicagotransittracker.app` (explicit).
3. Enable capability **Sign in with Apple** (default config — no related App IDs).
4. Save. Note your **Team ID** (visible top-right of the page).

### 1b. Services ID (used by web + Android via Firebase)

1. **Identifiers → +** → **Services IDs**.
2. Description: `Chicago Transit Tracker Web`. Identifier: `com.chicagotransittracker.web`.
3. Enable **Sign in with Apple** → **Configure**:
   - Primary App ID: `com.chicagotransittracker.app` (the one from 1a).
   - Domains and Subdomains: `chicago-transit-tracker.firebaseapp.com`
   - Return URLs: `https://chicago-transit-tracker.firebaseapp.com/__/auth/handler`
4. Save.

> Do not use the production domain (`chicagotransittracker.com`) here. Firebase Auth's Apple OAuth flow round-trips through `firebaseapp.com`, not your custom domain — registering the wrong return URL is the most common Sign-in-with-Apple-via-Firebase failure.

### 1c. Sign in with Apple key

1. **Keys → +** → name: `Chicago Transit Tracker SiwA`. Enable **Sign in with Apple** → **Configure** → Primary App ID: `com.chicagotransittracker.app`. Save.
2. Continue → **Register**. You'll only get to download the `.p8` file **once** — save it somewhere safe (e.g. 1Password). Note the **Key ID** (visible after creation).

### What you should have after Step 1

| Value             | Where it lives                         | Used in                          |
| ----------------- | -------------------------------------- | -------------------------------- |
| Team ID           | Top-right of the developer portal      | Firebase, Xcode                  |
| Bundle ID         | `com.chicagotransittracker.app`        | Already in app.json (no change)  |
| Services ID       | `com.chicagotransittracker.web`        | Firebase Apple provider config   |
| Key ID            | Keys page, after creating the key      | Firebase Apple provider config   |
| `AuthKey_*.p8`    | Local file (download once, save)       | Firebase Apple provider config   |

---

## Step 2 — Xcode signing (unblocks `pnpm run:ios`)

This is the step that fixes the code-signing error. After this, the simulator build will succeed because Xcode can produce a valid (development) signing identity for entitlement-bearing simulator builds.

1. Open Xcode → **Settings → Accounts → +** → sign in with the Apple ID that holds the paid Developer Program seat.
2. Open the workspace:
   ```bash
   open apps/mobile/ios/ChicagoTransitTracker.xcworkspace
   ```
3. Select the **ChicagoTransitTracker** target → **Signing & Capabilities** tab.
4. Check **Automatically manage signing** (should already be on).
5. **Team** dropdown → pick the paid team (will match the Team ID from Step 1).
6. Wait a few seconds — Xcode generates a **Development** provisioning profile + certificate. The yellow warning banner should clear.
7. Verify a signing identity now exists:
   ```bash
   security find-identity -v -p codesigning
   ```
   Expect at least one entry like `Apple Development: <name> (<id>)`.
8. Re-run from repo root:
   ```bash
   pnpm run:ios
   ```
   Expected: build runs (~3–5 min clean), simulator boots/reuses, app installs and launches. The "Sign in with Apple" button on the auth modal renders the native sheet — but tapping it will fail until Step 3 lands.

---

## Step 3 — Firebase Console (firebase.google.com → chicago-transit-tracker)

1. **Build → Authentication → Sign-in method**.
2. Find **Apple** in the providers list → **Edit** (or **Enable** if not yet enabled).
3. Fill in:
   - **Services ID**: `com.chicagotransittracker.web` (from 1b)
   - **Apple Team ID**: <Team ID from 1a>
   - **Key ID**: <Key ID from 1c>
   - **Private key**: paste the full contents of the downloaded `.p8` file (including the `-----BEGIN PRIVATE KEY-----` / `-----END PRIVATE KEY-----` lines)
4. Save.
5. Verify the OAuth handler URL Firebase shows matches the Return URL we registered in 1b: `https://chicago-transit-tracker.firebaseapp.com/__/auth/handler`. If they don't match, fix the Apple Service ID's Return URL — not the Firebase side.

---

## Step 4 — Code changes

For iOS + web, no code changes were needed: [apps/mobile/lib/auth.ts](apps/mobile/lib/auth.ts) (native sheet) and [apps/web/app/lib/auth.ts](apps/web/app/lib/auth.ts) (Firebase popup) already worked once Steps 1+3 enabled the upstream provider.

For **Android**, three code-side changes were made in this PR:

1. **Bridge route** at [apps/web/app/api/apple-redirect/route.ts](apps/web/app/api/apple-redirect/route.ts) — Next.js Route Handler that catches Apple's `form_post` response and renders an HTML page that redirects the in-app browser to `ctt://apple-callback#<form fields>`. POST handler (Apple's normal path) and GET handler (error/cancel fallback) both supported.
2. **Mobile Android branch** in [apps/mobile/lib/auth.ts](apps/mobile/lib/auth.ts) `signInWithApple()` — when `Platform.OS !== 'ios'`, opens `WebBrowser.openAuthSessionAsync` against Apple's `/auth/authorize` with `response_type=code id_token`, `response_mode=form_post`, `redirect_uri` set to the bridge URL. On callback, parses the deep-link fragment, validates `state`, extracts `id_token`, and calls Firebase `signInWithCredential` with the same `OAuthProvider('apple.com')` flow as iOS.
3. **Ungated Apple button** at [apps/mobile/app/auth.tsx](apps/mobile/app/auth.tsx) — the `Platform.OS === 'ios'` gate around the Sign in with Apple button is removed.

Tests:
- [apps/web/__tests__/api/apple-redirect.test.ts](apps/web/__tests__/api/apple-redirect.test.ts) — POST/GET handlers + URL encoding.
- [apps/mobile/__tests__/lib/auth.test.ts](apps/mobile/__tests__/lib/auth.test.ts) — iOS native flow, Android web-bridge flow, cancel/error/state-mismatch paths.
- [apps/mobile/__tests__/screens/auth.test.tsx](apps/mobile/__tests__/screens/auth.test.tsx) — updated to assert the Apple button renders on Android.

### Why `code id_token` + `form_post`

Apple's docs require `response_mode=form_post` whenever any scopes are requested (`name`, `email`). Using `id_token` alone with `fragment` mode would skip the bridge but disallow scopes. `code id_token` + `form_post` is the same combination Firebase's web SDK uses for `signInWithPopup` — battle-tested, returns the `id_token` we need, and ignores the auth `code` (which we don't exchange).

---

## Verification

End-to-end sanity check after Steps 1–4 land:

1. **`pnpm run:ios` succeeds** — simulator launches, app loads. (Step 2 alone is enough for this.)
2. **iOS native Sign in with Apple**:
   - On the simulator, sign out → tap **Continue with Apple** in the auth modal → native sheet appears → complete with a test Apple ID → land back in the app signed-in.
   - Verify a `profiles/<uid>` doc was created with `provider: 'apple'`.
3. **Web Sign in with Apple**:
   - `pnpm run:web` → open http://localhost:3000 → click sign-in → **Continue with Apple** → Apple popup → consent → redirect → signed-in.
4. **Android Sign in with Apple** (after this PR is deployed and the Service ID has the additional domain/return URL):
   - `pnpm --filter @ctt/mobile exec expo run:android` on a booted emulator.
   - Tap **Sign in with Apple** → in-app browser opens to `appleid.apple.com` → consent → in-app browser briefly shows "Completing sign-in…" on `chicagotransittracker.com/api/apple-redirect` → bounces to `ctt://apple-callback#…` → app captures it → user is signed in.
   - Verify a `profiles/<uid>` doc was created with `provider: 'apple'`.
5. **Compliance smoke check** (per [.claude/rules/transit-compliance.md](.claude/rules/transit-compliance.md)):
   - No agency logo or wordmark added.
   - No agency credentials in any client bundle.
   - No agency URLs called from `'use client'` or mobile screens.
   - Does not apply to this PR meaningfully (auth-only change), but good to confirm.

---

## Files this PR touched

- [apps/web/app/api/apple-redirect/route.ts](apps/web/app/api/apple-redirect/route.ts) (new)
- [apps/web/__tests__/api/apple-redirect.test.ts](apps/web/__tests__/api/apple-redirect.test.ts) (new)
- [apps/mobile/lib/auth.ts](apps/mobile/lib/auth.ts) — added Android branch in `signInWithApple()`
- [apps/mobile/app/auth.tsx](apps/mobile/app/auth.tsx) — removed `Platform.OS === 'ios'` gate on the Apple button + cleaned up unused `Platform` import
- [apps/mobile/__tests__/lib/auth.test.ts](apps/mobile/__tests__/lib/auth.test.ts) (new)
- [apps/mobile/__tests__/screens/auth.test.tsx](apps/mobile/__tests__/screens/auth.test.tsx) — added Android-renders-Apple-button assertion

Plus the upstream config done out-of-band:
- Apple Developer Console — Service ID `com.chicagotransittracker.web` gains `chicagotransittracker.com` as an additional Domain and `https://chicagotransittracker.com/api/apple-redirect` as an additional Return URL.

---

## Future work (separate plans)

- **App Store Connect app record / metadata.** Required for TestFlight + production release.
- **TestFlight builds.** Internal testing channel, replaces Firebase App Distribution for iOS once on TestFlight.
- **EAS submission profile / `eas submit`.** Automates uploading the `.ipa` to App Store Connect.
- **Custom domain attached to Firebase Auth.** Currently the Apple OAuth callback rounds through `firebaseapp.com`. Optional polish if you want the URL to read `chicagotransittracker.com`.
