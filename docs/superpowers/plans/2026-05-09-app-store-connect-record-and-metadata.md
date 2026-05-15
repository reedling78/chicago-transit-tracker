# App Store Connect — Record + Metadata

## Context

Setup work to register the iOS app in App Store Connect and fill in all the listing metadata Apple needs before we can submit a build for review. Result: an App Store Connect app record with metadata, App Privacy answers, pricing, and age rating fully filled in — ready for the first `eas submit` upload (which is a separate plan).

This is the prerequisite for TestFlight + production release, neither of which are in this plan.

**Out of scope (each is a separate follow-up plan):**
- Capturing iPhone + iPad screenshots from the simulator.
- Uploading a build via EAS or Transporter.
- TestFlight internal testing setup.
- App Review submission itself.

---

## Pre-flight info already known

| Field                         | Value                                          | Source                                                       |
| ----------------------------- | ---------------------------------------------- | ------------------------------------------------------------ |
| Bundle ID                     | `com.chicagotransittracker.app`                | [apps/mobile/app.json](apps/mobile/app.json)                 |
| Display name                  | Chicago Transit Tracker                        | [apps/mobile/app.json](apps/mobile/app.json)                 |
| Version                       | 1.0.2                                          | [apps/mobile/app.json](apps/mobile/app.json)                 |
| Apple Team ID                 | YW832TS8RK                                     | (from Sign-in-with-Apple work earlier)                       |
| Privacy Policy URL            | `https://chicagotransittracker.com/privacy`    | (needs Step 0 update before submission)                      |
| Support / Marketing URL       | `https://chicagotransittracker.com`            | (no dedicated /support page)                                 |
| 1024×1024 icon                | [apps/mobile/assets/icon.png](apps/mobile/assets/icon.png) | (currently RGBA — must be flattened to opaque RGB) |

---

## Step 0 — Update the public privacy policy (BLOCKING)

The privacy policy at [apps/web/app/privacy/page.tsx](apps/web/app/privacy/page.tsx) currently asserts:

> "This site does not require you to create an account or provide any personal information. We do not collect names, email addresses, or payment details."

This is now factually wrong. We collect:
- **Email address** (Firebase Auth, all sign-in methods)
- **Display name** (Firebase Auth, optional via Apple/Google/Facebook profile)
- **Profile photo URL** (Firebase Auth, optional via Apple/Google/Facebook profile)
- **Auth provider identifier** (Firebase Auth — `apple.com`, `google.com`, etc.)
- **User ID** (Firebase Auth UID — internal identifier)
- **Favorites map** (Firestore `profiles/{uid}.favorites` — line/station/train references)
- **Account creation/update timestamps** (Firestore `profiles/{uid}.createdAt`, `updatedAt`)

The policy needs a new section ("Account data") naming each of these, the purpose, the storage location (Firebase Auth + Firestore in Google's GCP), retention (until account deletion), and how to request deletion.

Apple's App Privacy section will list these data types — they MUST match what the policy publicly states. Mismatches are a common rejection reason at review. Plus: the existing wording is inaccurate to users today, regardless of submission.

**This needs to ship before we fill in App Store Connect's App Privacy answers.** I'll write the policy update as part of executing this plan.

---

## Step 1 — Create the App Store Connect app record

https://appstoreconnect.apple.com → **My Apps** → **+** → **New App**.

| Field            | Value                                          |
| ---------------- | ---------------------------------------------- |
| Platform         | iOS (check). macOS, tvOS, visionOS unchecked. |
| Name             | `Chicago Transit Tracker`                      |
| Primary Language | English (U.S.)                                 |
| Bundle ID        | `com.chicagotransittracker.app` (already registered, will appear in dropdown) |
| SKU              | `chicago-transit-tracker-ios` (any unique internal string; never shown to users) |
| User Access      | Full Access                                    |

Click **Create**.

---

## Step 2 — App Information

(Side nav → **App Information**)

| Field                | Value                                                                 |
| -------------------- | --------------------------------------------------------------------- |
| Subtitle             | `Live CTA, Metra, and Pace info` (30 chars)                           |
| Bundle ID            | `com.chicagotransittracker.app` (auto-filled)                         |
| Primary Category     | **Navigation**                                                        |
| Secondary Category   | **Travel**                                                            |
| Content Rights       | "No, this app does not contain, show, or access third-party content." (We display public agency data; no embedded third-party ads or content.) |

### Age rating

Click **Edit** next to "Age Rating" → answer the questionnaire. Every category should be **None** for this app. Resulting rating: **4+**.

(The questionnaire asks about violence, sexual content, profanity, alcohol/drugs, gambling, horror/fear themes, simulated gambling, controversial themes — all None. Realistic violence: None. User-generated content: None — users can save favorites but not post anything visible to other users.)

---

## Step 3 — Pricing and Availability

(Side nav → **Pricing and Availability**)

- **Price:** Free
- **Availability:** All territories (worldwide)
- **App Distribution Methods:** Public on the App Store
- **Bulk Purchase / Volume Purchase Program:** Off (consumer app, not enterprise)

---

## Step 4 — App Privacy

(Side nav → **App Privacy**)

This is the big one — the data-collection questionnaire. Apple's review team checks this against the public privacy policy.

### Privacy Policy URL

`https://chicagotransittracker.com/privacy`

### Do you or your third-party partners collect data from this app?

**Yes.**

### Data Types collected

For each entry below, the questionnaire asks:
- (a) Used for tracking? → **No** for everything (we don't share with ad networks or use cross-app tracking).
- (b) Linked to the user's identity? → see column below.
- (c) Purposes? → see column below.

| Data Type                                | Linked to user? | Purposes                              | Source                              |
| ---------------------------------------- | --------------- | ------------------------------------- | ----------------------------------- |
| **Contact Info → Email Address**         | Yes             | App Functionality, Account Management | Firebase Auth                       |
| **Contact Info → Name**                  | Yes (optional)  | App Functionality                     | Firebase Auth (social profile)      |
| **Identifiers → User ID**                | Yes             | App Functionality                     | Firebase Auth UID                   |
| **User Content → Photos or Videos**      | Yes (optional)  | App Functionality                     | Profile photo URL from social sign-in, stored in `profiles/{uid}.photoUrl` |
| **User Content → Other User Content**    | Yes             | App Functionality                     | `profiles/{uid}.favorites` (Firestore) |
| **Usage Data → Product Interaction**     | No              | Analytics                             | Google Analytics 4 (anonymized)     |
| **Diagnostics → Crash Data**             | No              | App Functionality, Analytics          | Firebase / system (only if enabled) |

> The "Photos or Videos" entry is for the profile photo URL that Apple/Google/Facebook hand us during social sign-in — we persist it to `profiles/{uid}.photoUrl` per [apps/web/app/components/AuthProvider.tsx:86](apps/web/app/components/AuthProvider.tsx) and [apps/mobile/lib/AuthContext.tsx:84](apps/mobile/lib/AuthContext.tsx). It's optional (null for email/password sign-in).

### Tracking

App tracks users across other companies' apps and websites? **No.**

---

## Step 5 — Version metadata (the "1.0" version listing)

(Side nav → **iOS App** → **1.0 Prepare for Submission**, or whichever version we're targeting first)

### Promotional Text (170 chars)

> Realtime CTA L, Metra, and Pace info — schedules, alerts, station details, and live train tracking. Save your favorites for one-tap access.

(Promotional text can be updated without resubmitting a new version — useful for time-sensitive copy like "Service alerts now include planned construction." Default to a stable line.)

### Description (4000 chars)

```
Chicago Transit Tracker is the fastest way to check trains, buses, and service alerts across the CTA, Metra, and Pace systems — without flipping between three different apps.

LIVE TRAIN AND BUS INFO
• Realtime CTA "L" arrivals at every Red, Blue, Brown, Green, Orange, Pink, Purple, and Yellow line station.
• Metra train positions, trip status, and stop-by-stop progress for every line in the system.
• Pace bus route timetables and schedules.

SERVICE ALERTS
• Filterable CTA and Metra alerts feeds — tap any line or station to see the alerts that affect it right now.
• Direct linkouts to the agency for every alert so you can confirm the latest details.

YOUR DAILY COMMUTE
• Sign in to save your favorite lines, stations, and trains.
• Drag-to-reorder dashboard for one-tap access to the things you check every day.
• Direction and density filters per station so the arrivals you see are the ones you actually take.

SCHEDULES AND TIMETABLES
• Built from the same official GTFS feeds the agencies publish.
• Per-station departure boards that update automatically when schedules change.
• Direction filtering and weekday / Saturday / Sunday tabs.

PRIVACY-FIRST
• No ads, no trackers.
• Account is optional — you can use the app fully without signing in.
• Sign-in stores your favorites only; we don't sell or share data.

ABOUT THE DATA
• CTA train and bus data via Chicago Transit Authority public APIs.
• Metra realtime feeds via Metra's GTFS Realtime API.
• Pace timetables via Pace public schedule data.

This app is not sponsored, affiliated, or operated by Chicago Transit Authority, Metra, or Pace.
```

### Keywords (100 chars, comma-separated)

```
CTA,Metra,Pace,Chicago,transit,train,bus,schedule,alerts,L train,commute,station
```

(94 chars — close to limit; refining is fine but watch the cap. Don't repeat the app name or subtitle in keywords; Apple already indexes those.)

### Support URL

`https://chicagotransittracker.com`

(If you want a dedicated `/support` page later for an issue-tracker linkout, it's a future enhancement.)

### Marketing URL (optional)

`https://chicagotransittracker.com`

### Version

`1.0.2` (matches `apps/mobile/app.json`)

### Copyright

`2026 Reed Rizzo`

(App Store convention — year + holder of the listing copyright. Not the app's source code license.)

### Routing App Coverage File

Skip — only required for apps that provide point-to-point directions like Apple Maps replacements.

---

## Step 6 — App Review Information

This is metadata Apple's reviewer sees but the public doesn't.

### Sign-In Information

Required because the app has sign-in. Provide a test account so reviewers can exercise the auth flow.

| Field    | Value                                              |
| -------- | -------------------------------------------------- |
| Username | (test email, e.g. `apple-review@chicagotransittracker.com` if you create one — otherwise reuse a personal Apple ID with no real data) |
| Password | (matching password)                                |

> Create a dedicated test account before this step. The reviewer will sign in with it; if it's missing or doesn't work, the app gets rejected.

### Contact Information

| Field      | Value                                |
| ---------- | ------------------------------------ |
| First Name | Reed                                 |
| Last Name  | Rizzo                                |
| Phone      | (your number)                        |
| Email      | reed.rizzo@gmail.com                 |

### Notes (4000 chars max)

Free-text for the reviewer. Useful to head off common rejection reasons:

```
Chicago Transit Tracker displays public transit information from the Chicago Transit Authority (CTA), Metra, and Pace — three Chicago-area agencies whose data is provided through their developer APIs.

The app is not affiliated with, sponsored by, or operated by any of these agencies. All data is publicly licensed and used in accordance with each agency's developer terms (see https://www.transitchicago.com/developers/terms/, https://metra.com/gtfs-realtime-api-key-request-license-agreement, and https://www.pacebus.com/route-timetable-data-services).

Sign-in is optional and only required to save personalized favorites. The app's full transit information is accessible without an account. A test account is provided above for review.

The bundle includes Sign in with Apple (per Apple's policy when offering other social sign-ins). The app does not include any third-party advertising, in-app purchases, or commerce.
```

### Attachment

Skip — not needed.

---

## Step 7 — Verification before submission

Before clicking "Submit for Review" (which is a separate plan), check:

- [ ] Privacy policy at `chicagotransittracker.com/privacy` lists all the data types we declare in Step 4.
- [ ] Support URL loads.
- [ ] Marketing URL loads.
- [ ] Test review account works — sign in via the iOS dev build with the same credentials.
- [ ] Age rating shown matches what we answered (should be 4+).
- [ ] App icon at 1024×1024 is **opaque** RGB (no alpha) — convert with `sips -s format png --setProperty hasAlpha no apps/mobile/assets/icon.png ...` or via image editor before upload. Without this, Transporter / EAS submit will reject.

---

## What I'll do in this plan vs. what you'll do

| Step                               | Who               |
| ---------------------------------- | ----------------- |
| Step 0 — Privacy policy update     | Me (code change)  |
| Step 1 — Create app record         | You (web UI)      |
| Step 2 — App Information           | You (web UI), with copy from this doc |
| Step 3 — Pricing                   | You (web UI)      |
| Step 4 — App Privacy questionnaire | You (web UI), with answers from this doc |
| Step 5 — Version metadata          | You (web UI), with copy from this doc |
| Step 6 — App Review Information    | You (web UI), with notes from this doc |
| Step 7 — Verification              | Me + you          |

I'll start by writing the privacy policy update (Step 0) so it can ship before you start filling in App Store Connect.
