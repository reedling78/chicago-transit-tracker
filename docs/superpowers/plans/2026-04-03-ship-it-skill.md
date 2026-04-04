# Ship-It Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a reusable Claude Code skill that automates: test generation, linting, doc updates, branch creation, commit, push, and PR — triggered when the user is done working on main.

**Architecture:** Single SKILL.md file in `.claude/skills/ship-it/` with a 9-step sequential process.

**Tech Stack:** Claude Code skills, git, gh CLI, Jest + React Testing Library, ESLint, Prettier

---

## Phase 1: Initial Skill (v1 — 6 steps)

Created the ship-it skill with a 6-step process: Analyze → Verify → Branch → Commit → PR → Report.

### Task 1: Create the ship-it skill

**Files:**

- Create: `.claude/skills/ship-it/SKILL.md`

- [x] **Step 1: Write SKILL.md with frontmatter and process**

Initial skill included:

- YAML frontmatter with name, description, and trigger phrases
- 6-step process: Analyze → Verify → Branch → Commit → PR → Report
- Common mistakes table
- Guards against staging secrets and shipping broken code

- [x] **Step 2: Baseline test (RED)**

Run a subagent WITHOUT the skill to see default PR workflow behavior. Documented gaps: no structured approach to branch naming, no lint check, no test generation, no doc updates.

- [x] **Step 3: Compliance test (GREEN)**

Run a subagent WITH the skill loaded. Verified it follows all 6 steps correctly, names branches descriptively, handles test failures, and excludes secrets.

### Task 2: Write spec and plan docs

**Files:**

- Create: `docs/superpowers/specs/2026-04-03-ship-it-skill-design.md`
- Create: `docs/superpowers/plans/2026-04-03-ship-it-skill.md`

- [x] **Step 1: Write spec document**
- [x] **Step 2: Write plan document**

---

## Phase 2: Expanded Skill (v2 — 9 steps)

User requested three additions:

1. **Generate/update unit tests** for changed source files before running `npm test`
2. **Lint check and auto-fix** — run `npm run lint`, auto-fix if needed, stop if unresolvable
3. **Update README.md and CLAUDE.md** — keep documentation current with code changes

### Key design decisions

- **Tests before lint** — lint runs after test generation so it catches formatting issues in generated test files too
- **Docs after lint** — docs are written based on the final state of the code (post-lint-fix)
- **Surgical doc updates only** — skill specifies which README/CLAUDE.md sections to check against changes, never rewrites the whole file
- **Test scope limited to components and pages** — matches existing `__tests__/` structure

New step order: Analyze → Generate Tests → Run Tests + Build → Lint → Update Docs → Branch → Commit → PR → Report

### Task 3: Update SKILL.md

**Files:**

- Modify: `.claude/skills/ship-it/SKILL.md`

- [x] **Step 1: Replace SKILL.md with the updated 9-step version**

The updated skill has these steps:

1. **Analyze Changes** — `git status`, `git diff`, `git log`. Build list of changed source files.
2. **Generate/Update Unit Tests** — For each changed source file, check for corresponding test in `__tests__/`. Create if missing, update if exists. Follow project patterns (Jest + RTL, `@/` imports, snapshot tests). Skip non-source files.
3. **Run Tests and Build** — `npm test` and `npm run build`. STOP if either fails. Fix generated tests if they fail.
4. **Lint Check and Fix** — `npm run lint`. If fails, `npm run lint:fix`, then re-check. STOP if errors remain.
5. **Update README.md and CLAUDE.md** — Check changes against documented sections. Update only affected sections. README triggers: components table, tech stack, commands, data model, site structure. CLAUDE.md triggers: project structure, tech stack, commands, architecture decisions, Firestore collections, standing rules, SEO rules, CI/CD, git workflow.
6. **Create Branch** — Derive name from diff. Lowercase, hyphen-separated, 2-4 words.
7. **Stage and Commit** — Stage by name (never `git add -A`). Include all artifacts: original changes, generated tests, lint fixes, doc updates. HEREDOC commit with Co-Authored-By.
8. **Push and Create PR** — `git push -u`. `gh pr create` with Summary bullets + Test plan checkboxes.
9. **Report** — PR URL + summary including test count, lint fixes, doc updates.

Common mistakes table expanded to 10 entries covering: secrets, lint, tests, docs, staging.

- [x] **Step 2: Verify the skill file is valid**

Read skill back — all 9 steps present, frontmatter valid, no placeholders.

### Task 4: Update Spec and Plan Docs

**Files:**

- Modify: `docs/superpowers/specs/2026-04-03-ship-it-skill-design.md`
- Modify: `docs/superpowers/plans/2026-04-03-ship-it-skill.md`

- [x] **Step 1: Update spec with new design decisions**

Added: test generation (file mapping, scope), lint check/fix (two-pass approach), documentation updates (surgical section updates, trigger lists), updated PR body format, expanded "not in scope".

- [x] **Step 2: Update plan to reflect 9-step process**

Combined Phase 1 and Phase 2 into single plan document for record keeping.

### Task 5: Compliance test (GREEN)

- [x] **Step 1: Run compliance test with subagent**

Dispatched subagent with updated 9-step skill. Verified it: correctly identified test files to create/update, handled lint failure with two-pass approach, identified correct doc sections to update, staged all artifacts by name, and knew to fix its own generated tests on failure.
