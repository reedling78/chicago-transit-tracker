# Plan — Station photo variants (desktop / mobile / OG)

## Context

Today every station has a single hero photo: stored at `stations/<slug>/hero.jpg` in
Firebase Storage, written to `Station.photoUrl`, consumed by `PageHeader` and as the
`og:image` fallback. That single asset has to do triple duty: a 1600×900 desktop hero,
a smaller mobile crop, and an Open Graph card.

A separate Cowork-side artifact (the Station Image Manager) now produces three
pre-sized JPEGs per station via canvas. This change extends the upload pipeline and
data model to consume those three variants:

| Variant | Size      | Use                                          |
| ------- | --------- | -------------------------------------------- |
| desktop | 1600×900  | Existing hero image (back-compat: mirrored to `photoUrl`) |
| mobile  | 800×450   | Future `<picture>` srcset wiring             |
| og      | 1200×630  | Per-page `og:image` / `twitter:image`        |

**Scope is upload-pipeline + data-model + OG metadata wiring.** `PageHeader` mobile
srcset and any UI changes that *render* the new variants are out of scope — that
needs component-level work in a separate PR. Existing `--check` / `--upload` modes
on the script and the existing `/station-image` skill stay intact and unchanged.

The only consumer change in this PR is `generateMetadata` on the two station pages,
because the OG variant has no value sitting unused on Firestore — wiring the fallback
chain is cheap and lets us start serving the right-sized OG card per station as soon
as variants are uploaded.

## Files to modify

### 1. `packages/shared/src/types.ts` — add `photoUrls` to `Station`

After `photoUrl: string | null` at [packages/shared/src/types.ts:47](packages/shared/src/types.ts:47), insert an optional discriminated object:

```ts
photoUrl: string | null
/**
 * Multi-variant hero image URLs. Populated by the Station Image Manager artifact's
 * --upload-variants pipeline. When set, `photoUrl` mirrors `photoUrls.desktop` so
 * existing consumers keep working unchanged. `null` (or field absent) on stations
 * that haven't been migrated to the variant pipeline yet.
 */
photoUrls: {
  /** 1600×900 — used wherever `photoUrl` is read today. */
  desktop: string
  /** 800×450 — for `<picture>` srcset on mobile breakpoints (future wiring). */
  mobile: string
  /** 1200×630 — `og:image` / `twitter:image`. */
  og: string
} | null
```

> The Explore survey mis-suggested `photoUrls?: string[]`. The spec calls for the
> discriminated object shape above — it makes intent self-documenting at every
> consumer.

### 2. `apps/web/scripts/upload-station-image.ts` — add `--upload-variants` mode

Three changes, all additive:

**(a)** Update the JSDoc header to document a third mode alongside the existing two:

```
--upload-variants <slug> <desktop-path> <mobile-path> <og-path>
  Uploads three pre-sized variants to stations/<slug>/hero-{desktop,mobile,og}.jpg,
  makes each public, writes both photoUrl (mirrored from desktop) and the photoUrls
  object back to Firestore, and prints a JSON summary.
```

**(b)** Add a new exported function parallel to `uploadStationImage` (which lives at [apps/web/scripts/upload-station-image.ts:40](apps/web/scripts/upload-station-image.ts:40)):

```ts
export async function uploadStationVariants(
  slug: string,
  paths: { desktop: Buffer; mobile: Buffer; og: Buffer },
  db: Firestore,
  bucket: Bucket,
  bucketName?: string,
): Promise<{ desktop: string; mobile: string; og: string; photoUrl: string }>
```

It must:
- Verify the station exists via `checkStation` (lines 33–38). Throw with a clear message naming the slug if not.
- For each of the three variants, mirror the existing `bucket.file(...).save(buffer, { contentType: 'image/jpeg', cacheControl: 'public, max-age=31536000, immutable' })` → `makePublic()` pattern. Storage paths: `stations/<slug>/hero-desktop.jpg`, `stations/<slug>/hero-mobile.jpg`, `stations/<slug>/hero-og.jpg`.
- Compute the public URLs (same `https://storage.googleapis.com/<bucket>/<path>` shape as `uploadStationImage`).
- Make a **single** Firestore `update()` call writing both `photoUrl` (= desktop URL, for back-compat) and `photoUrls: { desktop, mobile, og }`.
- Return all four URLs.

> Note the existing `uploadStationImage` only sets `contentType` on save — it does *not* set `cacheControl` today. The spec requires `cacheControl: 'public, max-age=31536000, immutable'` on the new variant uploads, so we add it for the three variant saves only. Don't retroactively change the v1 path's behavior.

**(c)** Extend the `main()` CLI dispatch at [apps/web/scripts/upload-station-image.ts:75](apps/web/scripts/upload-station-image.ts:75):

- Add a third branch: `if (mode === '--upload-variants')` parsing `[slug, desktopPath, mobilePath, ogPath]`. Verify all three files exist (mirror the existing `fileExists` check from the `--upload` branch); on missing files, print every missing path to stderr and `process.exit(2)`. Read each file into a Buffer, call `uploadStationVariants`, then `console.log(JSON.stringify(result))` as a single line and exit 0.
- Update the help block at the bottom to add the new usage line.

### 3. `apps/web/__tests__/scripts/upload-station-image.test.ts` — add `uploadStationVariants` tests

Match the existing library-only convention — sibling `cleanup-metra-trips.test.ts` and the existing `checkStation` / `uploadStationImage` blocks have no argv-level tests. Don't add CLI tests.

Add a new `describe('uploadStationVariants', ...)` block reusing the existing `makeDb` and `makeBucket` factories. Cover:

- **Happy path:** call with three buffers + a station that exists; assert
  - `bucket.file` called exactly three times with the three storage paths
  - `bucket.save` called three times with the three buffers, all with `contentType: 'image/jpeg'` and `cacheControl: 'public, max-age=31536000, immutable'`
  - `bucket.makePublic` called three times
  - `db.collection('stations').doc(slug).update` called once with both `photoUrl` (= desktop URL) and `photoUrls: { desktop, mobile, og }` set
  - returned object has `desktop`, `mobile`, `og`, `photoUrl` keys with the expected URLs

- **Station-missing case:** `makeDb(false)`; expect the call to reject with an error mentioning the slug. Assert that `bucket.save` was *never* called (don't upload bytes for a station that doesn't exist).

`makeBucket` already returns the `save`/`makePublic` jest mocks at the top level — Jest's `toHaveBeenNthCalledWith` covers per-call assertions, so no factory changes are needed.

### 4. `apps/web/app/cta/[line]/[station]/page.tsx` and `apps/web/app/metra/[line]/[station]/page.tsx` — wire OG variant

Both pages today hardcode `images: [siteConfig.ogImage]` in `openGraph.images` (CTA line 41, Metra line 43) and `twitter.images` (CTA line 48, Metra line 50). Change both occurrences in both files to use the fallback chain:

```ts
images: [station.photoUrls?.og ?? station.photoUrl ?? siteConfig.ogImage],
```

Apply identically to both `openGraph.images` and `twitter.images` on both pages — keep them in sync.

**Do not** touch `PageHeader imageSrc={station.photoUrl ?? ...}` lower in either file. Mobile srcset wiring is explicitly out of scope.

### 5. `.claude/skills/station-image/SKILL.md` — pointer to the bulk artifact

Insert a short note between the description (ends ~line 19) and the existing **Quick Reference** block (starts line 20). Keep it brief:

```markdown
> For multi-station uploads or generating all three variants at once, use the
> Station Image Manager artifact in Cowork instead. This skill remains the
> single-image, single-variant workflow.
```

No other changes to the skill — it stays the canonical fast path for "drop one screenshot on one station."

## Files to leave alone (deliberate non-scope)

- `apps/web/scripts/seed-stations.ts` — leave `photoUrls` unset on seed; existing rows surface as `photoUrls: null`/absent, which is fine.
- `apps/web/app/components/PageHeader.tsx` — no `<picture>`/srcset work here.
- The `stations/<slug>/hero.jpg` v1 storage path — leave it in place for stations still on it. The new `--upload-variants` writes to three new keys; old `hero.jpg` blobs become stale but don't break anything.
- Any consumer that reads `photoUrl` today — back-compat is the whole point. The desktop URL is mirrored into `photoUrl` on every variant upload so existing reads (`PageHeader`, `og:image` fallback chain, etc.) keep working with zero changes.

## Verification

From the repo root, in order:

```bash
# 1. Type check across the monorepo (catches any consumer that breaks on the new
#    photoUrls field — there shouldn't be any since it's optional).
pnpm -w run lint

# 2. Web tests (includes the new upload-station-variants block).
pnpm test:web

# 3. Sanity-check the CLI help renders the new mode.
cd apps/web && npx ts-node --project scripts/tsconfig.json scripts/upload-station-image.ts
# Expect: usage block on stderr listing all three modes (--check, --upload, --upload-variants), exit 2.

# 4. Spot-check existing modes still behave (no behavior change).
npx ts-node --project scripts/tsconfig.json scripts/upload-station-image.ts --check clark-lake
# Expect: prints the current photoUrl (or "null") exactly as before.
```

End-to-end variant upload (manual, optional — only if a Cowork artifact run is available with three staged JPEGs):

```bash
cd apps/web && npx ts-node --project scripts/tsconfig.json scripts/upload-station-image.ts \
  --upload-variants <slug> \
  ../../outputs/staged-uploads/<slug>/desktop.jpg \
  ../../outputs/staged-uploads/<slug>/mobile.jpg \
  ../../outputs/staged-uploads/<slug>/og.jpg

# Then confirm in Firestore that stations/<slug> has both photoUrl (desktop URL) and
# photoUrls { desktop, mobile, og } populated, and that the three Storage URLs return 200.
```

## Acceptance checklist (mirrors the spec)

- [ ] `Station` type compiles across web + mobile + functions + scripts (`pnpm -w run lint` clean)
- [ ] New `uploadStationVariants` test block passes; old `checkStation` + `uploadStationImage` blocks still pass
- [ ] Linter clean, no new warnings
- [ ] `--check` and `--upload` produce identical output to before (no behavior change)
- [ ] Help-output sanity check shows all three modes
- [ ] Both station pages' `generateMetadata` returns `og.image`/`twitter.image` pointing at `photoUrls.og` when set, falling back to `photoUrl` then `siteConfig.ogImage`
- [ ] Branch off `main`, push, open PR — do not merge. PR description explains the variant pipeline + Cowork artifact context.
