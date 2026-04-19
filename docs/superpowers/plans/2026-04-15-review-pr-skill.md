# Plan: Build `/review-pr` Skill

## Context

We need a skill that lets the user review incoming GitHub PRs from the terminal. The user provides a PR URL, the skill fetches full context (diff, CI status, existing reviews), analyzes the code against 4 dimensions (quality, conventions, architecture, security), presents findings interactively for triage, and submits a formal GitHub PR review with inline comments.

**Spec:** `docs/superpowers/specs/2026-04-15-review-pr-skill-design.md`

---

## Implementation Steps

### Step 1: Create the skill directory and SKILL.md

**File:** `.claude/skills/review-pr/SKILL.md`

Write the complete skill file with:
- Frontmatter: `name: review-pr`, `description` with trigger phrases
- Step-by-step instructions following the design spec's 6-step workflow
- Quick reference table of MCP tools used
- URL parsing logic for all 3 input formats
- PR summary card template
- Finding presentation format with severity badges
- Triage interaction model (Report / Edit & Report / Dismiss)
- Review type logic (REQUEST_CHANGES / COMMENT / APPROVE)
- Edge cases: no findings, all dismissed, PR already merged, CI failing

**Reference existing skills for patterns:**
- `.claude/skills/station-image/SKILL.md` — procedural steps, quick reference table
- `.claude/skills/article-writer/SKILL.md` — interactive multi-step workflow with user checkpoints
- `.claude/skills/ship-it/SKILL.md` — git/GitHub integration patterns

### Step 2: Test the skill

1. Find or create a test PR in the repo
2. Run `/review-pr <url>` and verify end-to-end flow
3. Test all 3 URL formats
4. Test the triage actions (report, edit, dismiss)
5. Verify the review posts correctly on GitHub

---

## Verification

- Skill is auto-discovered by Claude Code (no registration needed)
- `/review-pr <url>` triggers the skill
- PR summary card renders with correct data
- Findings are presented interactively by severity
- Submitted review appears on GitHub with inline comments
- All 3 URL formats parse correctly
