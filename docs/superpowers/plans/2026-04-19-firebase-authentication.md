# Firebase Authentication — Implementation Plan

## Context

The app currently has no authentication. All data is public transit info read from Firestore. We're adding Firebase Auth to both web and mobile so users can create accounts, sign in with Apple/Google/Facebook/email, manage their profile, and reset passwords. Each user gets a Firestore `profiles` document. A user icon appears in both the web navbar and mobile header bar.

---

## Phase 0: Shared Types

Add a Firebase-agnostic `UserProfile` type to the shared package.

**Modify `packages/shared/src/types.ts`** — add:

```typescript
export interface UserProfile {
  uid: string
  email: string | null
  displayName: string | null
  photoUrl: string | null
  provider: 'apple' | 'google' | 'facebook' | 'password'
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
}
```

**Modify `packages/shared/src/index.ts`** — add `UserProfile` to the type re-export.

---

## Phase 1: Firebase Client SDK Setup

### Web — add client SDK alongside existing admin SDK

1. `pnpm --filter @ctt/web add firebase@^11`
2. **Create `apps/web/app/lib/firebase-client.ts`** — initialize Firebase App + Auth using the same project config as mobile (apiKey, authDomain, projectId, etc.). Export `app` and `auth`.

### Mobile — add auth export

**Modify `apps/mobile/lib/firebase.ts`** — add `import { getAuth } from 'firebase/auth'` and `export const auth = getAuth(app)`.

---

## Phase 2: Auth Helper Functions

### Web — `apps/web/app/lib/auth.ts` (new file)

- `signInWithEmail(email, password)` — wraps `signInWithEmailAndPassword`
- `signUpWithEmail(email, password)` — wraps `createUserWithEmailAndPassword`
- `signOut()` — wraps `auth.signOut()`
- `resetPassword(email)` — wraps `sendPasswordResetEmail`
- `signInWithGoogle()` — `signInWithPopup(auth, new GoogleAuthProvider())`
- `signInWithApple()` — `signInWithPopup(auth, new OAuthProvider('apple.com'))`
- `signInWithFacebook()` — `signInWithPopup(auth, new FacebookAuthProvider())`

### Mobile — `apps/mobile/lib/auth.ts` (new file)

- Same email/password + reset helpers as web
- `signInWithApple()` — uses `expo-apple-authentication` to get credential, then `OAuthProvider('apple.com')` + `signInWithCredential`
- `signInWithGoogle()` — uses `expo-auth-session` with Google discovery, then `GoogleAuthProvider.credential()` + `signInWithCredential`
- `signInWithFacebook()` — uses `expo-auth-session` with Facebook discovery, then `FacebookAuthProvider.credential()` + `signInWithCredential`

**Install mobile deps:** `npx expo install expo-apple-authentication expo-auth-session expo-crypto expo-web-browser`

**Modify `apps/mobile/app.json`** — add `expo-apple-authentication` to plugins, ensure `scheme` is set for OAuth redirect.

---

## Phase 3: Auth Context Providers

### Mobile — `apps/mobile/lib/AuthContext.tsx` (new file)

- `AuthProvider` component wrapping `onAuthStateChanged` listener
- On user sign-in: fetch `profiles/{uid}` from Firestore; if missing, create it
- Exports `useAuth()` hook returning `{ user, profile, loading }`
- **Modify `apps/mobile/app/_layout.tsx`** — wrap contents with `<AuthProvider>`

### Web — `apps/web/app/components/AuthProvider.tsx` (new file, `'use client'`)

- Same pattern: `onAuthStateChanged` + profile fetch/create
- Imports from `apps/web/app/lib/firebase-client.ts`
- **Modify `apps/web/app/layout.tsx`** — wrap `<body>` children with `<AuthProvider>`

### Profile auto-creation logic (shared across both providers):

```typescript
const profileRef = doc(db, 'profiles', user.uid)
const snap = await getDoc(profileRef)
if (!snap.exists()) {
  const providerId = user.providerData[0]?.providerId
  const provider = providerId === 'apple.com' ? 'apple'
    : providerId === 'google.com' ? 'google'
    : providerId === 'facebook.com' ? 'facebook'
    : 'password'
  await setDoc(profileRef, {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoUrl: user.photoURL,
    provider,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}
```

---

## Phase 4: Firestore Security Rules

**Modify `firestore.rules`** — replace the wildcard with explicit collection rules so `profiles` are protected:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User profiles — owner only
    match /profiles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Transit data — public read, no client write
    match /lines/{docId} { allow read: if true; allow write: if false; }
    match /stations/{docId} { allow read: if true; allow write: if false; }
    match /schedules/{docId} { allow read: if true; allow write: if false; }
    match /metra-trips/{docId} { allow read: if true; allow write: if false; }
    match /metra-trip-indexes/{docId} { allow read: if true; allow write: if false; }
    match /metra-station-trips/{docId} { allow read: if true; allow write: if false; }
    match /gtfs-meta/{docId} { allow read: if true; allow write: if false; }
  }
}
```

> Note: Firestore rules are additive — the old `/{document=**}` wildcard would make profiles publicly readable. Switching to explicit collection rules prevents that. Any new collection added in the future needs its own rule.

---

## Phase 5: Web UI

### UserMenu — `apps/web/app/components/UserMenu.tsx` (new, `'use client'`)

- Not authenticated: renders a person icon button (same size/style as ThemeToggle)
- Clicking opens the AuthModal
- Authenticated: renders avatar circle (initials or photo) as a button
- Clicking opens a dropdown with "Profile" link and "Sign Out" button

### AuthModal — `apps/web/app/components/AuthModal.tsx` (new, `'use client'`)

- Modal overlay with Sign In / Sign Up toggle
- Email + password form fields with validation
- Social sign-in buttons (Apple, Google, Facebook)
- "Forgot password?" link → password reset form (email field + send button)
- Success/error inline messages
- Controlled via state from UserMenu

### Profile Page — `apps/web/app/profile/page.tsx` (new)

- Server component shell with `metadata` (title, description, openGraph, twitter)
- Renders `ProfileContent.tsx` (`'use client'`) which uses `useAuth()` to display:
  - Email address, display name, sign-in provider, member since
  - Sign Out button
  - Unauthenticated state: "Please sign in" message

### Navbar Integration

**Modify `apps/web/app/components/Navbar.tsx`** — add `<UserMenu />` to the `flex items-center gap-2` div, between ThemeToggle and MobileMenuToggle.

**Modify `apps/web/app/sitemap.ts`** — add `/profile` route.

---

## Phase 6: Mobile UI

### HeaderUserIcon — `apps/mobile/components/HeaderUserIcon.tsx` (new)

- Not authenticated: person outline icon → navigates to `/auth`
- Authenticated: avatar/initials circle → navigates to `/profile`

### Auth Screen — `apps/mobile/app/auth.tsx` (new)

- Presented as a modal (`presentation: 'modal'` in Stack.Screen)
- Email/password inputs with Sign In / Sign Up toggle
- Social sign-in buttons (hide Apple button on Android)
- Forgot password flow (email input + send reset button, uses `Alert.alert` for feedback)
- On success: `router.back()`

### Profile Screen — `apps/mobile/app/profile.tsx` (new)

- Dark themed (#0f0f23 background) consistent with app
- Shows email, display name, provider, member since
- Sign Out button

### Layout Integration

**Modify `apps/mobile/app/_layout.tsx`:**

- Add `headerRight: () => <HeaderUserIcon />` to `screenOptions`
- Add Stack.Screen entries:
  ```tsx
  <Stack.Screen name="auth" options={{ title: 'Sign In', presentation: 'modal' }} />
  <Stack.Screen name="profile" options={{ title: 'Profile' }} />
  ```

---

## Phase 7: Firebase Console Setup (manual)

These steps must be done in the Firebase Console before social auth works:

1. Authentication > Sign-in method > Enable: Email/Password, Google, Apple, Facebook
2. Google: auto-configured once enabled
3. Apple: add Apple Services ID, configure OAuth redirect URI (`https://chicago-transit-tracker.firebaseapp.com/__/auth/handler`)
4. Facebook: create Facebook Developer App, add App ID + Secret to Firebase
5. Add `ios.usesAppleSignIn: true` to `app.json` for Apple Sign In capability

---

## Phase 8: Testing

### Mock setup

- `apps/web/__tests__/mocks/firebase-auth.ts` — mock `firebase/auth` module
- `apps/mobile/__tests__/mocks/firebase-auth.ts` — same for mobile

### Test files

**Web:**
- `apps/web/__tests__/components/UserMenu.test.tsx`
- `apps/web/__tests__/components/AuthModal.test.tsx`
- `apps/web/__tests__/components/AuthProvider.test.tsx`
- `apps/web/__tests__/pages/profile.test.tsx`

**Mobile:**
- `apps/mobile/__tests__/components/HeaderUserIcon.test.tsx`
- `apps/mobile/__tests__/screens/auth.test.tsx`
- `apps/mobile/__tests__/screens/profile.test.tsx`
- `apps/mobile/__tests__/lib/auth.test.ts`

---

## File Inventory

### New files (14 + ~8 test files)

| File | Type |
|------|------|
| `apps/web/app/lib/firebase-client.ts` | Firebase client SDK init |
| `apps/web/app/lib/auth.ts` | Web auth helpers |
| `apps/web/app/components/AuthProvider.tsx` | Auth context (client) |
| `apps/web/app/components/UserMenu.tsx` | Navbar user icon (client) |
| `apps/web/app/components/AuthModal.tsx` | Sign in/up modal (client) |
| `apps/web/app/profile/page.tsx` | Profile page (server shell) |
| `apps/web/app/profile/ProfileContent.tsx` | Profile content (client) |
| `apps/mobile/lib/auth.ts` | Mobile auth helpers |
| `apps/mobile/lib/AuthContext.tsx` | Mobile auth context |
| `apps/mobile/components/HeaderUserIcon.tsx` | Header user icon |
| `apps/mobile/app/auth.tsx` | Mobile auth screen |
| `apps/mobile/app/profile.tsx` | Mobile profile screen |
| `apps/web/__tests__/mocks/firebase-auth.ts` | Web auth mocks |
| `apps/mobile/__tests__/mocks/firebase-auth.ts` | Mobile auth mocks |

### Modified files (8)

| File | Change |
|------|--------|
| `packages/shared/src/types.ts` | Add `UserProfile` interface |
| `packages/shared/src/index.ts` | Re-export `UserProfile` |
| `apps/web/app/layout.tsx` | Wrap children with `AuthProvider` |
| `apps/web/app/components/Navbar.tsx` | Add `UserMenu` component |
| `apps/web/app/sitemap.ts` | Add `/profile` route |
| `apps/mobile/lib/firebase.ts` | Add `auth` export |
| `apps/mobile/app/_layout.tsx` | Add AuthProvider, headerRight, new screens |
| `firestore.rules` | Explicit collection rules + profiles |

---

## Verification

1. **Web:** Run `pnpm run:web`, click user icon → sign up with email → verify profile doc in Firestore → navigate to `/profile` → sign out → sign in again
2. **Mobile:** Run `pnpm run:ios`, tap header icon → sign up → verify profile → sign out
3. **Password reset:** Use "Forgot password?" → check email arrives → reset works
4. **Social auth:** Test each provider on both platforms (Apple requires iOS device/Safari)
5. **Security rules:** Verify user A cannot read user B's profile doc (test via Firebase emulator or rules playground)
6. **Tests:** `pnpm test` passes with zero warnings
7. **Lint:** `pnpm lint` passes clean
8. **Deploy rules:** `firebase deploy --only firestore`
