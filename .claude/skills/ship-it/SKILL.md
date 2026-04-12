---
name: ship-it
description: Use when the user is done making changes on main and wants to create a PR. Trigger phrases - "ship it", "create a pr", "I'm done", "push this up". Handles test generation, linting, doc updates, branch creation, commit, push, and PR creation in one step.
---

# Ship It

Generate tests, lint, update docs, create a feature branch from main, commit all changes with a descriptive message, push, and open a PR — all in one step.

**Assumption:** The user works directly on `main` and calls this skill when ready to ship.

## Process

### Step 1: Analyze Changes

Run in parallel:
```bash
git status                    # What files changed
git diff                      # Staged + unstaged changes
git log --oneline -5          # Recent commit message style
```

Read the diff carefully. Understand what was built or changed — you need this for the branch name, commit message, PR body, test generation, and doc updates.

Build a list of changed source files (components in `apps/web/app/components/`, pages in `apps/web/app/`, and libraries in `apps/web/app/lib/`). You will need this list in Step 2.

### Step 2: Generate / Update Unit Tests

For each changed source file identified in Step 1, check whether a corresponding test file exists:

- Components (`apps/web/app/components/Foo.tsx`) → `apps/web/__tests__/components/Foo.test.tsx`
- Pages (`apps/web/app/cta/page.tsx`) → `apps/web/__tests__/pages/cta-list.test.tsx` (follow existing naming conventions — check `apps/web/__tests__/pages/` for the pattern)

**If a test file does not exist:** Create it following the project's test patterns:
- Import from `@testing-library/react` and `@testing-library/jest-dom`
- Import the component via the `@/` path alias (e.g., `import Hero from '@/app/components/Hero'`)
- Include at minimum: a render test, a key behavior test, and a snapshot test
- For page components that are async server components, call the function directly: `const ui = await PageComponent()` then `render(ui)`
- Look at existing test files in `apps/web/__tests__/` for reference

**If a test file already exists:** Read it and update it to cover any new or changed behavior from the diff. Do not remove existing passing tests.

**Do NOT generate tests for:** non-source files (configs, scripts, markdown, CSS, JSON), files in `apps/web/scripts/`, or test files themselves.

### Step 3: Run Tests and Build

```bash
pnpm -w run test
pnpm -w run build
```

**If either fails, STOP.** Tell the user what failed. Do not proceed until tests and build pass. If a test you just wrote fails, fix it before continuing.

### Step 4: Lint Check and Fix

```bash
pnpm -w run lint
```

This runs `eslint && prettier --check .` via turbo. If it exits cleanly, proceed to Step 5.

**If linting fails**, run the auto-fixer:
```bash
cd apps/web && pnpm run lint:fix
```

After `lint:fix`, run `pnpm -w run lint` again to verify all issues are resolved.

**If lint errors remain after `lint:fix`, STOP.** Report the remaining lint errors to the user. Do not proceed — these require manual attention.

### Step 5: Update README.md and CLAUDE.md

Review the full set of changes (original user changes + generated tests + lint fixes). Determine whether README.md or CLAUDE.md need updates.

**Update `README.md` if the changes affect any of these sections:**
- Components table — new or renamed components
- Tech Stack — new dependencies or version bumps
- Commands — new or changed scripts
- Data Model — new fields, changed types, new collections
- Site Structure — new routes or changed URL patterns
- Any other documented feature (dark mode, seeding, deploy, CTA branding, etc.)

**Update `CLAUDE.md` if the changes affect any of these sections:**
- Project Structure tree — new files or directories
- Tech Stack — new dependencies or tools
- Commands — new or changed scripts
- Key Architecture Decisions — new patterns or changed approaches
- Firestore Collections — schema changes
- Standing Rules — new conventions
- SEO Rules — new requirements
- CI / CD — workflow changes
- Git Workflow — process changes

**Rules for updating docs:**
- Only update the specific sections that are affected — do not rewrite the whole file
- Match the existing formatting and style of each file
- If a change does not affect any documented section, skip that file
- Read the current content of the file before editing to ensure you are making targeted, accurate changes

### Step 6: Create Branch

Derive the branch name from what the changes actually do:
- Lowercase, hyphen-separated, 2-4 words
- Descriptive of the feature/fix (e.g., `add-prettier-config`, `fix-station-slugs`, `metra-schedule-pages`)
- Never use generic names like `updates`, `changes`, `feature`

```bash
git checkout -b <branch-name>
```

### Step 7: Stage and Commit

Stage files by name — never use `git add -A` or `git add .`. Exclude secrets (`.env`, `service-account.json`, credentials).

Stage all relevant files including:
- The user's original changes
- Generated or updated test files
- Lint-fixed files
- Updated README.md and/or CLAUDE.md (if modified in Step 5)

Write the commit message:
- Imperative mood, descriptive subject line
- Body explains the "why" if not obvious from the subject
- Use HEREDOC format for clean multi-line messages
- Include Co-Authored-By trailer

```bash
git commit -m "$(cat <<'EOF'
<subject line>

<optional body explaining why>

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Step 8: Push and Create PR

```bash
git push -u origin <branch-name>
```

Create the PR with `gh pr create`. The PR body must include:

```bash
gh pr create --title "<short title under 70 chars>" --body "$(cat <<'EOF'
## Summary
- <bullet 1: what changed>
- <bullet 2: what changed>
- <bullet 3: why, if not obvious>

## Test plan
- [x] Unit tests generated/updated for changed source files
- [x] `pnpm -w run test` passes
- [x] `pnpm -w run build` passes
- [x] `pnpm -w run lint` passes
- [x] README.md and CLAUDE.md reviewed and updated (if applicable)

Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

### Step 9: Report

Print the PR URL and a short summary of what was shipped. Include:
- What the feature/fix does
- How many test files were created or updated
- Whether any lint issues were auto-fixed
- Whether README.md or CLAUDE.md were updated

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Generic branch name (`updates`) | Name describes the feature (`add-prettier-config`) |
| `git add -A` stages secrets | Stage files by name |
| Skipping tests before commit | Always run `pnpm -w run test` and `pnpm -w run build` first |
| PR title restates commit msg | PR title can be shorter/different — optimize for scanning |
| Forgetting to push with `-u` | Always `git push -u origin <branch>` |
| Shipping without lint check | Always run `pnpm -w run lint` before committing |
| Writing tests that don't follow project patterns | Read existing tests in `apps/web/__tests__/` for reference before writing new ones |
| Rewriting entire README/CLAUDE.md | Only update the specific sections affected by the changes |
| Generating tests for non-source files | Only test components (`apps/web/app/components/`) and pages (`apps/web/app/*/page.tsx`) |
| Forgetting to stage generated tests and doc updates | Stage ALL files from all steps — tests, lint fixes, and doc updates |
