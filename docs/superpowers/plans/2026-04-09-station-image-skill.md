# Station Image Skill

## Context

Station pages currently show a generic hero image in `PageHeader` — the default `/hero-header.jpg` for CTA stations, and `/hero-header-metra.jpg` for Metra stations. The `Station` type already has a `photoUrl: string | null` field ([app/lib/types.ts:47](app/lib/types.ts#L47)) that is fetched from Firestore ([app/lib/transit.ts:57-58](app/lib/transit.ts#L57-L58)) but never rendered.

We want an easy, repeatable workflow for adding a real photo to a station: give it a local image and a station URL, and have the image sized, uploaded to Firebase Storage, saved to the station's Firestore document, and shown on the station's page hero.

This is delivered as a new Claude Code skill (`/station-image`) plus a small helper script, with one-line edits to the two station page components.

## Approach

Three pieces:

1. **`.claude/skills/station-image/SKILL.md`** — slash-command skill that walks through the workflow, shells out to ImageMagick for resizing, and calls a helper script for the Firebase side. Modeled on [.claude/skills/article-writer/SKILL.md](.claude/skills/article-writer/SKILL.md)'s ImageMagick pattern.
2. **`scripts/upload-station-image.ts`** — Node/ts-node script that handles Firestore reads and Firebase Storage uploads. Modeled on [scripts/fetch-station-images.ts](scripts/fetch-station-images.ts) (specifically the `uploadImage` pattern at lines 172–184 and the Firestore update at lines 241–244).
3. **Station page wiring** — pass `station.photoUrl` through to `PageHeader` on both CTA and Metra station pages. `PageHeader` already accepts `imageSrc` ([app/components/PageHeader.tsx:12](app/components/PageHeader.tsx#L12)) and falls back to its default when undefined.

## Skill workflow

Invocation: `/station-image <local-image-path> <station-url>`

1. **Parse args.** Extract the station slug from the last path segment of the URL. Reject URLs that don't match `/cta/<line>/<station>` or `/metra/<line>/<station>`.
2. **Check station exists and inspect existing photo.** Run `npx ts-node --project scripts/tsconfig.json scripts/upload-station-image.ts --check <slug>`. Script reads `stations/<slug>` from Firestore, prints the current `photoUrl` (or `null`), and exits non-zero if the station doesn't exist.
3. **Confirm overwrite** if a `photoUrl` is already set — show the existing URL and ask the user to confirm before proceeding. Bail on no.
4. **Verify ImageMagick** — `which magick` (or `which convert` as fallback). Error with install instructions (`brew install imagemagick`) if missing.
5. **Resize and crop** to `/tmp/station-<slug>.jpg`:
   ```
   magick "<input>" -resize 1600x900^ -gravity center -extent 1600x900 -quality 85 /tmp/station-<slug>.jpg
   ```
   (`^` forces fill-and-crop rather than letterboxing; `-gravity center -extent` center-crops to exactly 1600×900.)
6. **Upload and update Firestore** via `npx ts-node --project scripts/tsconfig.json scripts/upload-station-image.ts --upload <slug> /tmp/station-<slug>.jpg`. Report the resulting public URL back to the user.
7. **Remind the user** to verify the hero renders in `npm run dev`.

## `scripts/upload-station-image.ts` spec

Two modes, driven by the first CLI arg:

- **`--check <slug>`**
  - Initialize Firebase Admin (reuse the init pattern from [fetch-station-images.ts:34-53](scripts/fetch-station-images.ts#L34-L53) — service account file, bucket `chicago-transit-tracker.firebasestorage.app`).
  - Fetch `stations/<slug>` from Firestore.
  - If the doc doesn't exist: `console.error` and `process.exit(1)`.
  - Otherwise print the `photoUrl` field (or the literal string `null`) to stdout and exit 0.

- **`--upload <slug> <file-path>`**
  - Same init.
  - Upload `<file-path>` to `stations/<slug>/hero.jpg` in the bucket (follow [fetch-station-images.ts:172-184](scripts/fetch-station-images.ts#L172-L184) — `bucket.file(destination).save(buffer, { metadata: { contentType: 'image/jpeg' } })`, then `file.makePublic()`).
  - Compute the public URL the same way `fetch-station-images.ts` does.
  - `db.collection('stations').doc(slug).update({ photoUrl: publicUrl })`.
  - Print the public URL to stdout and exit 0.

No new npm dependencies — `firebase-admin` is already installed.

## Station page wiring

Small edit in two files. Both currently call `<PageHeader ...>` without `imageSrc`. Change to:

```tsx
<PageHeader imageSrc={station.photoUrl ?? undefined} ... />
```

Files:

- [app/cta/[line]/[station]/page.tsx](app/cta/[line]/[station]/page.tsx)
- [app/metra/[line]/[station]/page.tsx](app/metra/[line]/[station]/page.tsx)

`PageHeader`'s existing default behavior handles the `undefined` case (CTA default / Metra-specific hero), so nothing else changes.

## Tests

Per the project's PostSourceFileEdit testing rule:

- **New**: `__tests__/scripts/upload-station-image.test.ts` — mock `firebase-admin` (Firestore chain + Storage `bucket().file().save()` / `makePublic()`). Cover:
  - `--check <slug>` prints the current `photoUrl` and exits 0 when the station exists.
  - `--check <slug>` exits non-zero when the station doesn't exist.
  - `--upload <slug> <file>` calls `file.save` with the expected destination, calls `makePublic`, and calls `doc.update({ photoUrl })` with the resulting URL.
- **Update**: any existing snapshot/render tests for the two station pages that break due to the new `imageSrc` prop. Use `mockStation` / `mockMetraStation` from [`__tests__/fixtures.ts`](__tests__/fixtures.ts) and add a case with `photoUrl` set to verify it's passed through.

No SKILL.md tests needed — skills are instructional markdown.

## Explicit non-goals

- No original-file preservation; only the processed `hero.jpg` is stored.
- No `storage.rules` file — `makePublic()` sets per-object ACLs, so public reads work without rules changes.
- No npm image library — rely on system ImageMagick, matching `article-writer`.
- No bulk mode — one station per invocation so the confirmation prompt stays meaningful.

## Critical files

Modified:
- [app/cta/[line]/[station]/page.tsx](app/cta/[line]/[station]/page.tsx) — pass `imageSrc` to `PageHeader`.
- [app/metra/[line]/[station]/page.tsx](app/metra/[line]/[station]/page.tsx) — pass `imageSrc` to `PageHeader`.

New:
- `.claude/skills/station-image/SKILL.md`
- `scripts/upload-station-image.ts`
- `__tests__/scripts/upload-station-image.test.ts`

Referenced (read-only, existing patterns to reuse):
- [app/components/PageHeader.tsx](app/components/PageHeader.tsx) — `imageSrc` prop.
- [app/lib/types.ts](app/lib/types.ts) — `Station.photoUrl`.
- [scripts/fetch-station-images.ts](scripts/fetch-station-images.ts) — Firebase init, upload pattern, Firestore update pattern.
- [.claude/skills/article-writer/SKILL.md](.claude/skills/article-writer/SKILL.md) — ImageMagick workflow reference.

## Verification

1. **Unit tests** — `npm test` passes with zero warnings and zero errors.
2. **Lint** — `npm run lint` is fully clean.
3. **Script smoke test (check mode)** — `npx ts-node --project scripts/tsconfig.json scripts/upload-station-image.ts --check clark-lake` prints the current `photoUrl` without error.
4. **End-to-end skill run** — invoke `/station-image <test-image> https://chicagotransittracker.com/cta/red/clark-lake`:
   - Confirms the skill parses the slug correctly.
   - Produces a 1600×900 JPEG at `/tmp/station-clark-lake.jpg`.
   - Uploads to `stations/clark-lake/hero.jpg` in Firebase Storage (verify in Firebase console).
   - Updates `stations/clark-lake.photoUrl` in Firestore (verify in Firebase console).
   - Run `npm run dev` and visit `/cta/red/clark-lake` — the uploaded photo should render as the `PageHeader` hero.
5. **Overwrite confirmation** — re-run the skill against the same station and confirm the prompt fires and bailing out leaves Firestore untouched.
6. **Fallback behavior** — visit a station with `photoUrl: null` and verify it still shows the default CTA / Metra-specific hero.
