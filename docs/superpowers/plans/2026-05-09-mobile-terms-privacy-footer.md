# Mobile Terms of Use, Privacy Policy, and Footer

## Context

The mobile app currently has no Terms of Use screen, no Privacy Policy screen, and no footer — the web app has all three. `.claude/rules/transit-compliance.md` flags this as a real compliance gap: Metra's GTFS Realtime License requires the disclaimer "not sponsored, affiliated, or operated by Metra" to be reachable wherever Metra data is shown, and a path to a Terms of Use must exist in-app.

This change closes that gap by:

1. Adding native mobile **Terms of Use** and **Privacy Policy** screens that mirror the web copy.
2. Adding a simple **Footer** component with two links (Terms of Use, Privacy Policy) that appears at the end of every scrolling screen except the auth modal.

The user has explicitly scoped this to "very simple for now — only show two links." This plan respects that. Footer wording changes (Metra exact phrasing, Pace addition) and a richer footer payload are out of scope and remain as compliance follow-ups.

## Decisions

- **Footer placement:** end of scroll content (in-flow), matching the web footer's behavior. Not pinned/sticky.
- **Content presentation:** native mobile screens that mirror web Terms/Privacy copy, styled with mobile theme tokens. No WebView, no external browser handoff.
- **Auth modal:** Footer is **not** rendered on `/auth` (it's a modal, not a "page").
- **Scope:** two-link footer only. The compliance disclaimer ("not sponsored, affiliated, or operated by Metra") lives inside the new Terms screen, which is one tap away.

## Files to add

### `apps/mobile/components/Footer.tsx` (new)

Simple presentational component. Two `Pressable` rows that route to `/terms` and `/privacy` via `expo-router`'s `useRouter().push()`. Themed with `useTheme()` + `makeStyles(theme)` + `useMemo` per the project's standard pattern (see `apps/mobile/components/dashboard/cards/cardStyles.ts:63` and `apps/mobile/app/profile.tsx:47`).

Visual: a top border (`theme.colors.border.subtle`), `paddingVertical: theme.space[4]`, two centered text links in `theme.colors.text.muted`, separated by a thin dot `·`. No copyright string, no attribution string — the user wants minimal.

### `apps/mobile/app/terms.tsx` (new)

Mirrors `apps/web/app/terms/page.tsx`. Sections (each rendered as a styled `<Text>` heading + body):

- **Overview** — uses Metra's required exact phrasing: "is not sponsored, affiliated, or operated by Metra." Also covers CTA non-affiliation.
- **Accuracy of Information** — reference text only; verify with CTA / Metra; include `Linking.openURL` taps to `transitchicago.com` and `metra.com`.
- **No Warranty** — "as is" / "as available."
- **Intellectual Property** — CTA route colors used per CTA Trademark Guidelines, no agency logos reproduced.
- **External Links** — third-party links not endorsed.
- **Changes to These Terms** — informational.
- **Contact** — site contact information (mirror web).

Layout: a single `ScrollView` styled like the existing detail screens. Top inset via `useNavHeaderInset()` (header is shown — global Stack handles back button). The Footer is appended at the bottom of the scroll content, like every other screen.

### `apps/mobile/app/privacy.tsx` (new)

Mirrors `apps/web/app/privacy/page.tsx`. Sections:

- **Overview** — no personal data, GA4 only.
- **Information We Collect** — anonymized analytics, no names/emails required, IP anonymized.
- **Cookies** — GA4 first-party + localStorage equivalent (mention AsyncStorage for theme preference on mobile instead of localStorage).
- **How We Use Data** — analytics for improvement only.
- **Third-Party Services** — Google Analytics, Firebase.
- **Your Choices** — opt-out via device settings / browser.
- **Children's Privacy** — under-13 policy.
- **Changes to This Policy** — informational.
- **Contact** — site contact information.

Same layout pattern as `terms.tsx`: ScrollView + `useNavHeaderInset()` top padding + Footer at the end.

### `apps/mobile/__tests__/components/Footer.test.tsx` (new)

Test that the Footer:

1. Renders two text links labelled "Terms of Use" and "Privacy Policy."
2. Calls `router.push('/terms')` and `router.push('/privacy')` when each link is pressed.

Use `jest-expo` preset, `@testing-library/react-native`, mock `useRouter` from `expo-router` (pattern lifted from `apps/mobile/__tests__/screens/profile.test.tsx`).

### `apps/mobile/__tests__/screens/terms.test.tsx` and `privacy.test.tsx` (new)

Lightweight smoke tests:

1. Screen renders without crashing.
2. The Metra-required wording "not sponsored, affiliated, or operated by Metra" is present on the Terms screen (compliance assertion — fails if the wording is altered).
3. The Footer is rendered (assert the two link strings appear).

## Files to modify

The Footer must appear on every scrolling screen except `/auth`. Each of these screens currently uses a single `ScrollView` (or a `FlatList` for the home dashboard). The change is mechanical: import `Footer` and render it as the last child of the scroll content (or `ListFooterComponent` for FlatList).

Screens to touch:

- `apps/mobile/app/cta/index.tsx` — CTA service list
- `apps/mobile/app/cta/[line].tsx` — CTA line detail
- `apps/mobile/app/cta/station/[station].tsx` — CTA station detail
- `apps/mobile/app/cta/alerts.tsx` — CTA alerts
- `apps/mobile/app/metra/index.tsx` — Metra service list
- `apps/mobile/app/metra/[line]/index.tsx` — Metra line detail
- `apps/mobile/app/metra/[line]/train/[trainNumber].tsx` — Metra train detail
- `apps/mobile/app/metra/station/[station].tsx` — Metra station detail
- `apps/mobile/app/metra/alerts.tsx` — Metra alerts
- `apps/mobile/app/profile.tsx` — Profile screen
- `apps/mobile/components/dashboard/Dashboard.tsx` / `DashboardGrid.tsx` — Home dashboard (Footer goes into `ListFooterComponent`, alongside the existing DashboardHero footer slot — wrap the existing `listFooter` so the Footer appears below the hero cards)

**Skipped:** `apps/mobile/app/auth.tsx` (modal — explicit user decision).

### Layout updates (`apps/mobile/app/_layout.tsx`)

Two new `Stack.Screen` declarations are not strictly required — expo-router auto-discovers `terms.tsx` and `privacy.tsx`. They will inherit the global `headerTransparent` + `HeaderBackButton` options. Confirm during implementation that the back button works as expected; if not, add explicit Stack.Screen entries.

## Files NOT to modify (out of scope)

- `apps/web/app/components/Footer.tsx` — the web footer wording gap (Metra exact phrasing, Pace addition) is a separate compliance task.
- `apps/mobile/components/PageHeader.tsx` — Footer lives in scroll content, not in the header.
- `apps/web/app/terms/page.tsx`, `apps/web/app/privacy/page.tsx` — only being read for content mirroring.

## Verification

End-to-end manual + automated checks:

1. **Run mobile tests:** `pnpm --filter mobile test` — must pass with zero warnings.
2. **Run web tests:** `pnpm test:web` — should be unaffected (sanity check that the shared package wasn't accidentally touched).
3. **Run lint:** `pnpm lint:mobile` — must be clean.
4. **iOS simulator (`pnpm run:ios`):**
   - Open the app, scroll to the bottom of the home dashboard — Footer is visible with two links.
   - Tap "Terms of Use" → Terms screen loads, back arrow returns home.
   - Scroll Terms to the bottom — Footer is rendered there too (Footer linking back to itself is fine).
   - Verify the exact phrase "not sponsored, affiliated, or operated by Metra" appears in the Overview section.
   - Tap "Privacy Policy" from the Terms-screen footer → Privacy screen loads.
   - Open a CTA line, Metra line, station, train detail, alerts — confirm Footer appears at the end of each.
   - Open the Auth modal (Sign In) — confirm Footer does NOT appear.
   - Toggle dark mode on Profile — confirm Footer colors look correct in both themes.
5. **Android emulator (`pnpm run:android`):** repeat the simulator checks.
6. **Compliance check:** the Metra license disclaimer is now reachable in-app from any screen in two taps (footer link → Terms Overview).

## Notes for the implementer

- Follow the existing makeStyles pattern. Don't introduce a new styling approach.
- Don't add the compliance disclaimer to the Footer itself — the user said "very simple for now." Keep it to two links.
- Don't link out to the web Terms / Privacy URLs from the new mobile screens — the content lives on-device per the user's choice.
- Don't add a "Site Map" link — that's a web-only feature.
