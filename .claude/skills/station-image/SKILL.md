---
name: station-image
description: Use when the user wants to add or replace the hero photo on a CTA or Metra station page. Trigger phrases — "/station-image", "add a photo to station X", "replace the hero image for X station".
---

# Station Image

Add or replace a station's hero photo. Requires a local image file and a station URL.

**Invocation:** `/station-image [image-path] [station-url]`

All arguments are optional:
- **No image path?** Find the newest screenshot on the user's Desktop: `ls -t ~/Desktop/Screenshot*.png | head -1`
- **No station URL?** Ask the user for it.

Example: `/station-image ~/Downloads/clark-lake.jpg https://chicagotransittracker.com/cta/red/clark-lake`

> For multi-station uploads or generating all three variants at once, use the
> Station Image Manager artifact in Cowork instead. This skill remains the
> single-image, single-variant workflow.

---

## Quick Reference

| What | Detail |
|------|--------|
| Output size | 1600×900 JPEG, quality 85 |
| Storage path | `stations/<slug>/hero.jpg` |
| Firestore field | `Station.photoUrl` |
| URL pattern | `/cta/<line>/<station>` or `/metra/<line>/<station>` |
| Script | `apps/web/scripts/upload-station-image.ts` |
| Requires | ImageMagick (`brew install imagemagick`) |

---

## Steps

### 1. Parse and validate

- Extract slug from URL's last path segment
- Verify the image file exists
- Stop if URL doesn't match `/cta/<line>/<station>` or `/metra/<line>/<station>`

### 2. Check for existing photo

```bash
npx ts-node --project apps/web/scripts/tsconfig.json apps/web/scripts/upload-station-image.ts --check <slug>
```

- Non-zero exit → station not in Firestore, stop
- `null` → no existing photo, continue
- URL returned → ask user to confirm replacement

### 3. Resize and crop

```bash
magick "<image-path>" -resize 1600x900^ -gravity center -extent 1600x900 -quality 85 /tmp/station-<slug>.jpg
```

### 4. Upload

```bash
npx ts-node --project apps/web/scripts/tsconfig.json apps/web/scripts/upload-station-image.ts --upload <slug> /tmp/station-<slug>.jpg
```

Show the returned public URL, delete `/tmp/station-<slug>.jpg`, and tell the user the station page will pick it up automatically.
