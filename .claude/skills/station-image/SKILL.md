---
name: station-image
description: Use when the user wants to add or replace the hero photo on a CTA or Metra station page. Takes a local image file and a station URL, resizes the image to a 1600×900 hero, uploads it to Firebase Storage, writes the URL to the station's Firestore document, and the station page picks it up automatically via its existing `photoUrl` field. Trigger phrases — "/station-image", "add a photo to station X", "replace the hero image for X station".
---

# Station Image Skill

Add a hero photo to a station page. Run each step in order — do not skip ahead.

**Invocation:** `/station-image <local-image-path> <station-url>`

Example:

```
/station-image ~/Downloads/clark-lake.jpg https://chicagotransittracker.com/cta/red/clark-lake
```

Both arguments are required. If either is missing, stop and ask the user for it.

---

## Step 1 — Parse arguments

1. Treat the first argument as the local file path and the second as the station URL.
2. Extract the station slug from the URL's **last path segment**. The URL must match one of these shapes:
   - `/cta/<line>/<station>`
   - `/metra/<line>/<station>`
3. If the URL doesn't match, stop and tell the user: _"URL must point to a station page, e.g. `https://chicagotransittracker.com/cta/red/clark-lake`."_
4. If the local file doesn't exist, stop and tell the user: _"File not found: `<path>`."_

---

## Step 2 — Check the station and any existing photo

Run:

```bash
npx ts-node --project scripts/tsconfig.json scripts/upload-station-image.ts --check <slug>
```

- If the command exits non-zero, the station isn't in Firestore — stop and report `"Station <slug> not found in Firestore"`.
- If stdout is the literal string `null`, there's no existing photo — continue to Step 3.
- Otherwise stdout is the current photo URL. **Show it to the user and ask:**

  > "This station already has a photo: `<existing-url>`. Replace it? (yes/no)"

  If the user says no, stop. Do not modify anything.

---

## Step 3 — Verify ImageMagick is installed

```bash
which magick || which convert
```

If neither is found, stop and tell the user:

> "ImageMagick is required. Install it with `brew install imagemagick` and re-run the skill."

---

## Step 4 — Resize and center-crop to 1600×900

Create a processed JPEG in `/tmp`:

```bash
magick "<local-image-path>" -resize 1600x900^ -gravity center -extent 1600x900 -quality 85 /tmp/station-<slug>.jpg
```

Notes:

- `-resize 1600x900^` scales so the image fills the 1600×900 box (may overflow one dimension).
- `-gravity center -extent 1600x900` center-crops to exactly 1600×900.
- `-quality 85` produces a reasonably compressed JPEG.

Confirm the output file exists before continuing.

---

## Step 5 — Upload and update Firestore

Run:

```bash
npx ts-node --project scripts/tsconfig.json scripts/upload-station-image.ts --upload <slug> /tmp/station-<slug>.jpg
```

This uploads the file to `stations/<slug>/hero.jpg` in the `chicago-transit-tracker.firebasestorage.app` bucket, calls `makePublic()`, and updates the station's `photoUrl` field in Firestore.

The script prints the resulting public URL on success. Show it to the user.

---

## Step 6 — Clean up and confirm

1. Delete the temp file: `rm /tmp/station-<slug>.jpg`
2. Tell the user:

   > "Uploaded. The station page will pick up the new hero automatically. Run `npm run dev` and visit the station page to verify it renders."

That's the whole skill.
