# Ship-It Skill — Design Spec

## Problem

The user's workflow is to make changes directly on `main`, then manually create a branch, commit, push, and open a PR. This is repetitive and error-prone — branch names can be inconsistent, commit messages may lack detail, and steps can be forgotten. Additionally, test coverage can be missed for new code, lint errors can slip through, and documentation (README.md, CLAUDE.md) can go stale as the codebase evolves.

## Goal

Create a Claude Code skill called `ship-it` that automates the entire PR workflow in one step: analyze changes, generate unit tests, verify tests and build pass, lint check and auto-fix, update project documentation, create a descriptive branch, commit, push, and open a PR with a structured summary.

## Design Decisions

### Single-step workflow

The skill runs all steps sequentially — no user interaction needed between steps. The user calls it when done and gets back a PR URL.

### Branch naming derived from diff analysis

Rather than asking the user for a branch name, the skill reads the diff and derives a descriptive name (e.g., `add-prettier-config`, `fix-station-slugs`). This ensures consistency: lowercase, hyphen-separated, 2-4 words.

### Test generation before verification

The skill generates or updates unit tests for any changed source files BEFORE running `npm test`. This ensures new code always ships with test coverage. The test generation follows existing project patterns (Jest + React Testing Library) and uses the established file mapping:

- `app/components/Foo.tsx` → `__tests__/components/Foo.test.tsx`
- Page files → `__tests__/pages/<name>.test.tsx` (following existing naming conventions)

Tests are not generated for non-source files (configs, scripts, markdown, CSS, JSON).

### Lint check and auto-fix

After tests pass, the skill runs `npm run lint` (which executes `eslint && prettier --check .`). If linting fails, it attempts `npm run lint:fix` to auto-resolve issues. If auto-fix cannot resolve all errors, the skill stops and reports — it never ships code with lint errors.

Lint runs after test generation so it catches formatting issues in both user code and generated test files.

### Documentation updates

Before committing, the skill reviews changes and updates README.md and CLAUDE.md if any documented sections are affected. This prevents documentation drift. Updates are surgical — only the specific sections affected by the changes are modified, not the entire file. The skill checks against a defined list of section triggers for each file:

- **README.md triggers:** components table, tech stack, commands, data model, site structure, documented features
- **CLAUDE.md triggers:** project structure, tech stack, commands, architecture decisions, Firestore collections, standing rules, SEO rules, CI/CD, git workflow

### Verify before shipping

Tests, build, and lint must all pass before committing. If any fail, the skill stops and reports — never ships broken code.

### Stage files by name, not `git add -A`

Prevents accidentally committing secrets (`.env`, `service-account.json`) or unrelated files. The staging step must include all artifacts from the pipeline: original changes, generated tests, lint fixes, and documentation updates.

### Structured PR body

Every PR gets a `## Summary` section with bullet points and a `## Test plan` section with specific checkboxes for: test generation, `npm test`, build, lint, and doc review.

## Trigger Phrases

- "ship it"
- "create a pr"
- "I'm done"
- "push this up"

## What's NOT in Scope

- Interactive branch naming (skill decides based on diff)
- Multiple commits per PR (assumes one logical unit of work)
- Rebasing or squashing (GitHub handles this at merge time)
- Integration or end-to-end tests (only unit tests are generated)
