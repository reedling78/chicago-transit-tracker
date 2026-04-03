---
name: research
description: Use when the user asks to research a topic, investigate an API, explore a technology, or gather reference material that should be saved for later. Produces a markdown doc in docs/research/. Trigger phrases: "research X", "look into X", "investigate X", "I want to understand X before we build".
---

# Research Skill

Guide the user through focused research on a topic, synthesize findings from sources, and write a persistent reference document to `docs/research/`. Follow each step in order.

The goal is reference-grade research — material the team will cite again in a spec, plan, or implementation. For quick one-off lookups that won't be referenced again, this skill is unnecessary.

---

## Step 1 — Clarify the research question

Ask the user:
1. **Topic** — what is being researched?
2. **Question** — what specific question are we trying to answer? (e.g. "What are our options for rendering MDX in a static Next.js export?" not just "MDX")
3. **Source URLs** — any specific URLs, docs, or APIs to read? (optional — if none provided, use WebSearch to find relevant sources)
4. **Next step** — what will this research feed into? (e.g. "feeds into brainstorming for the articles feature", "deciding whether to use this API")

The "next step" shapes how findings are framed. Know it before researching.

---

## Step 2 — Fetch and read sources

For each source URL provided:
- Fetch it with WebFetch and read the content
- If no URLs were provided, use WebSearch to find 2–4 relevant sources, then fetch each

If any fetch fails, tell the user and ask for a replacement URL before continuing.

Do not summarize sources yet — read all of them first, then synthesize.

---

## Step 3 — Synthesize findings

Across all sources, identify:
- The direct answer to the research question
- Key options, trade-offs, or decision points
- Anything that contradicts assumptions the user may have had going in
- Anything that should inform the next step (spec, plan, implementation)

Present a brief synthesis to the user for a gut-check before writing the doc. Keep it to a paragraph or a short list — this is a checkpoint, not the final output.

Ask: "Does this capture what you were looking for, or should I dig into anything else before writing the doc?"

---

## Step 4 — Write the research doc

Generate the filename from today's date and the topic slug:
`docs/research/YYYY-MM-DD-{topic-slug}.md`

Write the file with this structure:

```markdown
# Research: {topic}

**Date:** YYYY-MM-DD
**Question:** {the specific question from Step 1}
**Feeds into:** {next step from Step 1}

---

## Key Findings

{3–7 concrete findings, written as prose or a tight list. No filler. Each finding should be something a teammate could act on or cite.}

## Options / Trade-offs

{If the research surfaced multiple approaches or tools, compare them here. Include your recommendation if one is clearly better.}

## Open Questions

{Anything this research did not resolve that the team should investigate further. Omit this section if there are none.}

## Sources

{List each source as: - [Page title or description](url)}
```

**Writing rules:**
- Write for a teammate who will read this in three months and needs to understand what was learned and why it matters — not just a list of facts
- No AI filler phrases ("it's worth noting", "delve into", "in conclusion")
- Frame the next step in the `Feeds into:` line and the Options section — not as a separate section

Confirm the file was written successfully, then tell the user the path.
