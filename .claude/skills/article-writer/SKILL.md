---
name: article-writer
description: Use when the user wants to write, draft, or publish a new article for the /articles section of the site. Guides through the full workflow: research, metadata, planning, writing, image processing, and writing the MDX file to disk. Trigger phrases: "write an article", "new article", "draft a post", "publish something about X".
---

# Article Writer Skill

Guide the author through researching, writing, and publishing an MDX article for Chicago Transit Tracker. Follow each step in order. Do not advance to the next step until the current one is confirmed by the author.

Articles live at: `content/articles/{slug}/{slug}.mdx`
Images live at: `public/images/articles/{slug}/`

---

## Step 1 — Collect Inputs

Ask for:
1. **Subject** — what is the article about?
2. **Angle / description** — what is the specific take, thesis, or hook?
3. **Source URLs** — any reference URLs to use as research material (optional)

Fetch each source URL with WebFetch and read the content. Use fetched content as background context only — do not quote sources in the article body unless explicitly requested. Save all source URLs to the `references` frontmatter field later.

If any fetch fails, stop and ask the author for a replacement URL before continuing.

---

## Step 2 — Collect Metadata

**Present these together for a single approval pass** (auto-suggest values before presenting):
- `title` — the article headline
- `description` — 1–2 sentence meta description (used in OG/Twitter cards and the article list)
- `slug` — URL-safe lowercase-hyphenated identifier (e.g. `cta-red-line-history`)
- `category` — one label (e.g. "CTA", "Metra", "Transit History", "Guides")
- `tags` — array of tags

**Then collect one at a time:**
1. `author` — full name
2. `authorImage` — suggest `/images/authors/{first-last}.jpg` as the default before asking
3. `date` — "What date should appear on this article? Default is today (YYYY-MM-DD)."
4. `publishAt` — "Publish immediately, or schedule for a future date and time? If scheduling, use ISO 8601 format (e.g. 2026-06-01T09:00:00-05:00)."
5. `featuredPost` — "Should this be the featured article on the site? Only one article can be featured at a time. (yes/no)"

Field notes:
- `date` is the display date shown to readers — it does not control visibility
- `publishAt` controls visibility at build time — leave empty for immediate publishing
- `image`, `ogImage`, and `twitterImage` are auto-derived from the slug — never ask the author to type these paths
- `imageVersion` is auto-generated at write time — never ask the author for this value

---

## Step 3 — Propose Article Plan

Present:
- **Angle / thesis** — one paragraph stating the central argument or narrative
- **Section structure** — ordered list of proposed H2 sections, each with a one-sentence description
- **Tone** — describe the intended voice (e.g. "authoritative but conversational, written for a transit-curious Chicago resident")
- **Target length** — 700–1000 words of prose body text

Wait for explicit approval before writing. If the author requests changes, revise and present the plan again.

---

## Step 4 — Write the Article

Write the full article body in MDX. Apply these rules strictly:

**Voice & tone:**
- Authoritative, not academic. Conversational where appropriate.
- Written for a curious Chicago transit rider, not a transit engineer.
- No AI phrases: "In conclusion", "It's worth noting", "Dive into", "Delve", "Let's explore", "It's important to understand"
- No filler. No generic transitions.
- Do not open with a restatement of the title.

**Structure:**
- Prose-first. Use subheadings to organize sections, not to introduce bullet lists.
- No bullet lists unless the content is genuinely enumerable (e.g. a list of stops, a step-by-step).
- No emoji in headers or body.
- Structure adapts to content — no rigid template.

**Technical terms** — wrap inline on first use:
```
<span data-term class="underline decoration-dotted cursor-help">term</span>
```

**Images:** The hero image is rendered by the page template from frontmatter — do not include it in the MDX body. Use standard markdown `![alt](path)` for any inline images.

Present the completed article for review. Do NOT write any files yet.

Wait for approval or revision requests. Make any requested edits and present again before proceeding.

---

## Step 5 — Process Images

Ask the author:
> "What is the file path to the source image for this article?"

Then:

1. Check ImageMagick is installed:
   ```bash
   which magick || which convert
   ```
   If not found, tell the author to run `brew install imagemagick` and wait for confirmation before continuing.

2. Determine the file extension from the source path. Then run all three commands:

   ```bash
   # Copy original
   cp "{source}" "public/images/articles/{slug}/{slug}.{ext}"

   # OG image — 1200×630, center crop
   magick "{source}" -resize 1200x630^ -gravity Center -extent 1200x630 "public/images/articles/{slug}/{slug}-og.{ext}"

   # Twitter image — 1200×675, center crop
   magick "{source}" -resize 1200x675^ -gravity Center -extent 1200x675 "public/images/articles/{slug}/{slug}-twitter.{ext}"
   ```

3. Confirm all three files were created successfully before proceeding.

---

## Step 6 — Write to Disk

1. **Generate `imageVersion`** — use the current Unix millisecond timestamp (call `Date.now()` equivalent — use the actual current time, not a placeholder).

2. **Assemble the complete MDX file** and show it to the author for final review:

```mdx
---
title: "{title}"
description: "{description}"
date: {date}
author: "{author}"
authorImage: "{authorImage}"
image: "/images/articles/{slug}/{slug}.{ext}"
ogImage: "/images/articles/{slug}/{slug}-og.{ext}"
twitterImage: "/images/articles/{slug}/{slug}-twitter.{ext}"
slug: "{slug}"
category: "{category}"
tags: [{tags}]
featuredPost: {featuredPost}
draft: false
publishAt: "{publishAt}"
imageVersion: {imageVersion}
references:
  - label: "{source title}"
    url: "{source url}"
---

{article body}
```

3. Ask: **"Ready to write this file to disk? (yes/no)"**

4. If yes:
   - If `featuredPost: true`: search for all other MDX files with `featuredPost: true` and set them to `false` first:
     ```bash
     grep -rl "featuredPost: true" content/articles/
     ```
     Show the author which files will be updated before making changes.
   - Create the directory: `content/articles/{slug}/`
   - Write the file: `content/articles/{slug}/{slug}.mdx`
   - Confirm the write succeeded and show the author the final file path.
