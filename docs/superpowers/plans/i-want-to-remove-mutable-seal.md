# Plan: Remove Facebook Login

## Context

Facebook sign-in is wired into both the web and mobile auth flows but was never fully configured (mobile's `FACEBOOK_APP_ID` is an empty `'' // TODO` string, so the mobile button always throws). We are removing Facebook as a sign-in provider entirely. Remaining providers: Email/Password, Apple, Google.

Per decisions made during planning:
- **Full removal** — drop `'facebook'` from the `UserProfile['provider']` union and all Facebook display labels. Pre-existing profile docs with `provider: 'facebook'` will fall back to no label / `'password'` resolution; this is accepted.
- **Leave historical docs** — the dated plan/spec docs under `docs/superpowers/plans/` are historical records and are NOT edited. Only living docs (`CLAUDE.md`) and user-facing copy (privacy policies) are updated.

A manual follow-up (outside this codebase, noted at the end) is required to disable the Facebook provider in the Firebase console.

## Files to change

### Web app

**`apps/web/app/lib/auth.ts`**
- Remove `FacebookAuthProvider` from the `firebase/auth` import (line 9).
- Delete the `signInWithFacebook()` function (lines 37-39).

**`apps/web/app/components/AuthModal.tsx`**
- Remove `signInWithFacebook` from the `@lib/auth` import (line 10).
- Change `handleSocial` signature to `(provider: 'google' | 'apple')` and replace the 3-way branch with `if (provider === 'google') await signInWithGoogle(); else await signInWithApple()` (lines 63-68).
- Delete the Facebook `<button>` (lines 198-204).
- Change the social button grid from `grid-cols-3` to `grid-cols-2` (line 183).

**`apps/web/app/components/AuthProvider.tsx`**
- Delete the line `if (providerId === 'facebook.com') return 'facebook'` (line 38).

**`apps/web/app/profile/ProfileContent.tsx`**
- Remove the `facebook: 'Facebook',` entry from `providerLabels` (line 40).

### Mobile app

**`apps/mobile/lib/auth.ts`**
- Remove `FacebookAuthProvider` from the `firebase/auth` import (line 10).
- Remove the now-unused `import * as AuthSession from 'expo-auth-session'` (line 13) — it is only used by `signInWithFacebook`. (The Google flow uses `expo-auth-session/providers/google` in `app/auth.tsx`, a different import; the `expo-auth-session` package stays in `package.json`.)
- Delete the `requireClientId()` helper (lines 47-51) — it becomes unused once `signInWithFacebook` is gone (`signInWithGoogleCredential` does its own inline check).
- Delete the `signInWithFacebook()` function (lines 213-236).

**`apps/mobile/app/auth.tsx`**
- Remove `signInWithFacebook` from the `../lib/auth` import (line 22).
- `handleSocial` only ever handled `'apple' | 'facebook'`; simplify to a no-arg function that calls `signInWithApple()` (lines 77-85), and update its call site (line 150 `onPress`).
- Delete the Facebook `<TouchableOpacity>` (lines 158-160).

**`apps/mobile/lib/AuthContext.tsx`**
- Delete the line `if (providerId === 'facebook.com') return 'facebook'` (line 36).

**`apps/mobile/app/profile.tsx`**
- Remove the `facebook: 'Facebook',` entry from `providerLabels` (line 99).

### Shared types

**`packages/shared/src/types.ts`**
- Change line 149 to `provider: 'apple' | 'google' | 'password'` (drop `'facebook' |`).

### User-facing copy (compliance — must stay accurate)

**`apps/web/app/privacy/page.tsx`**
- Line 56: `(Apple, Google, Facebook, or email and password)` → `(Apple, Google, or email and password)`.
- Line 64: `supplied by Apple, Google, or Facebook during` → `supplied by Apple or Google during`.
- Line 134: `Apple, Google, and Facebook social sign-in uses` → `Apple and Google social sign-in uses`.

**`apps/mobile/app/privacy.tsx`**
- Line 32: `(Apple, Google, Facebook, or email and password)` → `(Apple, Google, or email and password)`.

### Living documentation

**`CLAUDE.md`**
- Line 229: `social (Apple, Google, Facebook)` → `social (Apple, Google)`.
- Line 284: `Firebase Authentication (Email/Password, Apple, Google, Facebook)` → `(Email/Password, Apple, Google)`.
- Line 376: `four providers: Email/Password, Apple, Google, and Facebook.` → `three providers: Email/Password, Apple, and Google.`
- Line 379: `expo-auth-session (Google/Facebook)` → `expo-auth-session (Google)`.
- Line 447: provider union → `'apple' | 'google' | 'password'`.

### Tests (required — a PostSourceFileEdit hook enforces test updates)

**`apps/web/__tests__/lib/auth.test.ts`**
- Remove `signInWithFacebook` from the import (line 17).
- Delete the `signInWithFacebook calls signInWithPopup...` test (lines 69-73).

**`apps/web/__tests__/components/AuthModal.test.tsx`**
- Remove `const mockSignInWithFacebook = jest.fn()` (line 9) and the `signInWithFacebook` key in the `jest.mock` factory (line 17).
- Remove `expect(screen.getByText('Facebook')).toBeInTheDocument()` from the "renders social sign-in buttons" test (line 104).

**`apps/web/__tests__/mocks/firebase-auth.ts`**
- Remove `FacebookAuthProvider: jest.fn(),` (line 40).

**`apps/mobile/__tests__/screens/auth.test.tsx`**
- Remove `signInWithFacebook: jest.fn(),` from the `../../lib/auth` mock (line 20).
- Rename the "always renders Google and Facebook sign-in buttons" test to cover Google only and delete the `Sign in with Facebook` assertion (lines 51-55).

**`apps/mobile/__tests__/lib/auth.test.ts`**
- Remove `FacebookAuthProvider: { credential: jest.fn() },` from the `firebase/auth` mock (line 21).

## Verification

1. `pnpm -w run lint` — must pass clean (catches the unused `AuthSession` / `requireClientId` removals and any dangling imports).
2. `pnpm -w run test` — full suite must pass with zero failures (web + mobile auth tests updated above).
3. Web manual check: `pnpm run:web`, open the site, click **Sign In** → the auth modal shows exactly two social buttons (Google, Apple) in a 2-column grid, no layout gap. Email/Google/Apple sign-in still work.
4. Mobile manual check: `pnpm run:ios` (or `:android`), open the auth screen → only **Sign in with Apple** and **Sign in with Google** appear; no Facebook button. Apple + Google sign-in still work.
5. Confirm the profile screen still renders a provider label for Apple/Google/password accounts (web `ProfileContent.tsx`, mobile `profile.tsx`).
6. Grep the repo for `acebook` (case-insensitive) and confirm the only remaining hits are the intentionally-untouched historical docs under `docs/superpowers/plans/`.

## Manual follow-up (out of code scope)

In the Firebase console → **Authentication → Sign-in method**, disable the **Facebook** provider so the project no longer accepts Facebook OAuth. Any existing accounts created via Facebook will no longer be able to sign in (accepted per the full-removal decision).
