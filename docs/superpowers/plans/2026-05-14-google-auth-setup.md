# Plan: Set up Google sign-in for web + mobile

> Suggested final filename per CLAUDE.md conventions: `docs/superpowers/plans/2026-05-14-google-auth-setup.md` — rename after plan approval (cannot rename in plan mode).

## Context

Google sign-in is currently broken on both the web app and the mobile app:

- **Web** (`chicagotransittracker.com`): clicking "Google" in the sign-in modal throws `Firebase: Error (auth/unauthorized-domain)`. The Firebase project does not list `chicagotransittracker.com` as an authorized auth domain.
- **Mobile** (iOS, presumably Android too): tapping "Sign in with Google" throws `Google client ID is not configured. Set it in apps/mobile/lib/auth.ts`. The `GOOGLE_WEB_CLIENT_ID` constant at [apps/mobile/lib/auth.ts:21](apps/mobile/lib/auth.ts#L21) is an empty string.

Both Apple and Email/Password sign-in already work on both platforms — the project's auth plumbing is sound. We are only filling in Google-specific config.

The fixes split cleanly into **(A) console configuration** (no code) and **(B) mobile code wiring** (needs OAuth client IDs from the Firebase/Google Cloud console, then a small refactor in `apps/mobile/lib/auth.ts`).

---

## A. Firebase + Google Cloud console (no code)

These are one-time setup steps in the Firebase console for the `chicago-transit-tracker` project. Do these first — the code in section B reads OAuth client IDs that are created here.

### A1. Fix the web `auth/unauthorized-domain` error

1. Firebase console → Authentication → **Settings** → **Authorized domains**.
2. Add `chicagotransittracker.com`. If you have a `www.` variant or any custom preview domains in use, add those too.
3. `localhost` and `chicago-transit-tracker.firebaseapp.com` are added by default — leave them alone.

This single step resolves the web error. No code change.

### A2. Confirm Google is enabled as a sign-in provider

Firebase console → Authentication → **Sign-in method** → **Google** → enable.

When Google is enabled here, Firebase automatically creates a **Web OAuth 2.0 client** in the linked Google Cloud project. We need its **Client ID** for mobile (see A4) — copy it down from this screen (Firebase shows it under "Web SDK configuration").

### A3. Create an iOS OAuth 2.0 client

Google Cloud console → APIs & Services → **Credentials** → **Create credentials** → **OAuth client ID**:

- Application type: **iOS**
- Name: `Chicago Transit Tracker iOS`
- Bundle ID: `com.chicagotransittracker.app` (matches [apps/mobile/app.json:18](apps/mobile/app.json#L18))

Save the **Client ID** and its **iOS URL scheme** (Google shows it as a reverse-DNS string, e.g. `com.googleusercontent.apps.591975765807-xxxxxxxx`).

### A4. Create an Android OAuth 2.0 client

Google Cloud console → Credentials → Create credentials → OAuth client ID:

- Application type: **Android**
- Name: `Chicago Transit Tracker Android`
- Package name: `com.chicagotransittracker.app` (matches [apps/mobile/app.json:31](apps/mobile/app.json#L31))
- SHA-1 certificate fingerprint: needed for both **debug** and **production**.
  - Debug (Expo dev client): `eas credentials -p android` to get the keystore fingerprint, or run `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android`.
  - Production: fetch via `eas credentials -p android` against the production build profile (or copy from the Google Play Console → App signing).

You can add multiple SHA-1s to a single Android OAuth client — add both.

Save the **Android Client ID**.

> Net result of A2–A4: three OAuth client IDs (web, iOS, Android). All three are needed because `expo-auth-session` issues platform-native auth flows on each platform but exchanges the ID token against the **web** client when building the Firebase credential.

---

## B. Mobile code changes

Only one file changes meaningfully: [apps/mobile/lib/auth.ts](apps/mobile/lib/auth.ts). A second small change is needed in [apps/mobile/app.json](apps/mobile/app.json) so iOS recognizes the Google reverse-DNS URL scheme.

### B1. Add the iOS URL scheme to `app.json`

Under `expo.ios`, add a `bundleIdentifier` sibling:

```json
"ios": {
  "bundleIdentifier": "com.chicagotransittracker.app",
  "buildNumber": "3",
  "usesAppleSignIn": true,
  "infoPlist": {
    "ITSAppUsesNonExemptEncryption": false,
    "CFBundleURLTypes": [
      { "CFBundleURLSchemes": ["com.googleusercontent.apps.591975765807-xxxxxxxx"] }
    ]
  }
}
```

Substitute the iOS URL scheme from A3. This is required so Google's OAuth callback can return to the app on iOS.

### B2. Refactor `signInWithGoogle` to use per-platform client IDs

The current implementation (around [apps/mobile/lib/auth.ts:183-204](apps/mobile/lib/auth.ts#L183-L204)) uses a single `GOOGLE_WEB_CLIENT_ID` with a hand-built `AuthSession.AuthRequest`. The standard Expo-blessed pattern is `expo-auth-session/providers/google`, which selects the right client ID per platform and produces the correct redirect URI on each.

**Recommended approach: switch to `expo-auth-session/providers/google`.**

This is a hook (`Google.useAuthRequest`), so the call site moves from a plain async function into the React component that owns the "Sign in with Google" button. Concretely:

1. **In `apps/mobile/lib/auth.ts`**: replace the three constants with three explicit per-platform IDs and export a small helper that returns the configured params. Keep `signInWithGoogleCredential(idToken)` as the Firebase-exchange step:

```typescript
const GOOGLE_WEB_CLIENT_ID = '<from A2>'
const GOOGLE_IOS_CLIENT_ID = '<from A3>'
const GOOGLE_ANDROID_CLIENT_ID = '<from A4>'

export const googleAuthConfig = {
  webClientId: GOOGLE_WEB_CLIENT_ID,
  iosClientId: GOOGLE_IOS_CLIENT_ID,
  androidClientId: GOOGLE_ANDROID_CLIENT_ID,
}

export function signInWithGoogleCredential(idToken: string) {
  return signInWithCredential(auth, GoogleAuthProvider.credential(idToken))
}
```

Delete the old `signInWithGoogle()` function and the `requireClientId` guard for Google (Apple/Facebook keep theirs).

2. **In the sign-in screen** (currently [apps/mobile/app/auth.tsx](apps/mobile/app/auth.tsx) per the Stack route): import the Google provider, call its hook at the top of the component, and wire the existing button's `onPress` to `promptAsync()`. Pattern:

```typescript
import * as Google from 'expo-auth-session/providers/google'
import { googleAuthConfig, signInWithGoogleCredential } from '../lib/auth'

const [, response, promptGoogle] = Google.useAuthRequest(googleAuthConfig)

useEffect(() => {
  if (response?.type === 'success' && response.params.id_token) {
    signInWithGoogleCredential(response.params.id_token).catch(/* show error */)
  }
}, [response])
```

The existing "Sign in with Google" button's `onPress` becomes `() => promptGoogle()`.

### B3. (Optional, recommended) Move OAuth client IDs to env vars

The codebase currently hardcodes Firebase client config — that's fine for those values (they're public SDK keys). Google OAuth client IDs are also non-secret, but they differ between projects. If you ever spin up a staging Firebase project, you'll want env-driven IDs.

If you want to do this now: add the three IDs to `apps/mobile/app.json` under `expo.extra.googleAuth`, read them via `expo-constants`, and document them in `apps/mobile/.env.example`. **This is a nice-to-have, not required to fix the bug — skip if you want the smallest possible change.**

---

## Files modified

- [apps/mobile/lib/auth.ts](apps/mobile/lib/auth.ts) — replace `GOOGLE_WEB_CLIENT_ID` constant + `signInWithGoogle()` function with per-platform config + `signInWithGoogleCredential()` (~15 lines net).
- [apps/mobile/app.json](apps/mobile/app.json) — add `CFBundleURLTypes` under `expo.ios.infoPlist` (~3 lines).
- [apps/mobile/app/auth.tsx](apps/mobile/app/auth.tsx) — wire `Google.useAuthRequest` hook into the existing "Sign in with Google" button (~10 lines).
- **No web code changes.** The Firebase console fix in A1 is sufficient.

---

## Verification

### Web (immediately after A1)

1. Reload `chicagotransittracker.com`.
2. Open sign-in modal → click **Google**.
3. Expect a Google popup, account picker, redirect back, and the navbar avatar to update.
4. Confirm a new doc appeared in Firestore at `profiles/{uid}` (auto-creation in `AuthProvider`).

### Mobile iOS

1. Rebuild the dev client (the `CFBundleURLTypes` change requires a native rebuild — `pnpm --filter mobile run distribute:ios` or `npx expo run:ios`).
2. Open the app → Sign in → **Sign in with Google**.
3. Expect Safari/in-app browser → Google account picker → redirect back into the app → signed-in state.

### Mobile Android

1. Rebuild the dev client (`pnpm --filter mobile run distribute:android` or `npx expo run:android`).
2. Same flow as iOS.
3. If the redirect fails silently, the most common cause is a missing/wrong SHA-1 on the Android OAuth client — re-check A4.

### Both

4. Sign out → sign in again to confirm session persistence works.
5. Verify the `profiles/{uid}` doc has `provider: 'google'`.
6. Run `pnpm test` and `pnpm lint` — no new failures.

---

## Out of scope

- Apple, Facebook, Email/Password sign-in flows (already working).
- Switching the codebase to env-var-driven Firebase config (separate cleanup).
- Production SHA-1 wiring is mentioned but assumes you already have a production keystore via EAS — first-time prod signing setup is a separate task.
