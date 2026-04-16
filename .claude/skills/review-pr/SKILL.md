---
name: review-pr
description: Use when the user wants to review a GitHub pull request. Fetches PR context, analyzes the diff against project standards, presents findings interactively, and posts a formal GitHub PR review with inline comments. Trigger phrases — "/review-pr", "review this PR", "review pull request", "code review <url>".
---

# Review PR

Review a GitHub pull request — fetch full context, analyze the diff, triage findings interactively, and post a formal PR review with inline comments.

**Invocation:** `/review-pr <github-pr-reference>`

## Quick Reference

| What | Detail |
|------|--------|
| MCP tools | `get_pull_request`, `get_pull_request_files`, `get_pull_request_status`, `get_pull_request_reviews`, `get_pull_request_comments`, `create_pull_request_review` |
| Review types | `REQUEST_CHANGES` (critical findings), `COMMENT` (important/suggestions only), `APPROVE` (clean PR) |
| Severity levels | Critical, Important, Suggestion |
| Review dimensions | Code quality, Project conventions, Architecture, Security |

---

## Step 1: Parse Input

Accept the PR reference in any of these formats:

| Format | Example |
|--------|---------|
| Full URL | `https://github.com/owner/repo/pull/123` |
| Short ref | `owner/repo#123` |
| Bare number | `123` (derives owner/repo from local git remote) |

**Parsing rules:**

- Full URL: extract `owner`, `repo`, and PR number from the path segments
- Short ref: split on `/` and `#` to get owner, repo, and number
- Bare number: run `git remote get-url origin` and parse the GitHub owner/repo from it

**If no argument is provided**, ask the user for a PR URL before proceeding.

**If the URL cannot be parsed**, stop and tell the user what format is expected.

---

## Step 2: Gather Context

Fetch all PR context using GitHub MCP tools. Run these in parallel where possible:

1. **`mcp__github__get_pull_request`** — title, body, author, base/head branches, state, head SHA
2. **`mcp__github__get_pull_request_files`** — changed files with patch diffs, additions, deletions
3. **`mcp__github__get_pull_request_status`** — CI check results
4. **`mcp__github__get_pull_request_reviews`** — existing reviews
5. **`mcp__github__get_pull_request_comments`** — existing inline comments

**If the PR is already merged or closed**, tell the user and ask if they still want to review it (read-only, no review will be posted).

Save the **head commit SHA** from the pull request data — you will need it when submitting the review in Step 6.

### Display the PR Summary Card

After gathering data, display a summary:

```
## PR #<number>: <title>
Author: @<author> | Base: <base> ← <head branch>
Files changed: <count> | +<additions> / -<deletions>
CI: <✓ N passed, ✗ N failed, ◷ N pending> or <no checks>
Existing reviews: <count> | Comments: <count>
```

If CI checks are failing, note which checks failed.

### Load Project Standards

If the repo is checked out locally, read these files to inform the convention checks:
- `CLAUDE.md` (project rules and architecture)
- `.claude/rules/code-style.md`
- `.claude/rules/testing.md`
- `.claude/rules/security.md`

If not local, skip this — review based on general best practices only.

---

## Step 3: Analyze

Review each changed file's patch diff against **4 dimensions**. For each issue found, record the file path, line number, severity, dimension, title, explanation, and a suggested review comment.

### Dimensions

**1. Code quality & bugs**
- Logic errors, off-by-one errors, race conditions
- Unhandled edge cases, null/undefined safety
- Error handling gaps (missing catch, swallowed errors)
- Unnecessary complexity, confusing naming
- Dead code, unused imports

**2. Project conventions** (informed by CLAUDE.md and rules files)
- TypeScript strict mode violations, use of `any`
- Wrong import aliases (`@components/*`, `@lib/*`, `@ctt/shared`)
- Server/client component boundary violations (`firebase-admin` in client code)
- Missing or incorrect metadata/SEO exports
- Test coverage gaps for changed source files
- Tailwind/CSS patterns (dark mode, responsive design)

**3. Architecture & design**
- Component responsibilities — doing too much, unclear boundaries
- Data flow — prop drilling, unnecessary state, wrong data fetching location
- Separation of concerns — mixing server and client logic
- Abstraction level — premature abstraction or missing useful extraction

**4. Security**
- Secrets or API keys in client-side code
- Missing input validation on API routes
- Injection risks (SQL, XSS, command injection)
- Unsafe external API calls from client components (should go through `/api/` routes)
- Missing or incorrect cache headers on API routes

### Severity Levels

| Level | Meaning | Review impact |
|-------|---------|---------------|
| **Critical** | Bugs, security vulnerabilities, data loss risks | Must fix before merge |
| **Important** | Convention violations, architectural concerns, missing tests | Should fix |
| **Suggestion** | Style improvements, alternative approaches, minor optimizations | Nice to have |

### Deduplication

Before recording a finding, check the existing reviews and comments fetched in Step 2. **Skip any issue that has already been raised** by another reviewer. Do not duplicate feedback.

### No findings?

If the analysis is clean — no issues found — skip Step 4 and go directly to Step 5 with the "clean PR" flow.

---

## Step 4: Interactive Triage

Present findings **one at a time**, ordered by severity (all Critical first, then Important, then Suggestion).

For each finding, display:

```
### [<Severity>] <title>
📁 <file-path>:<line-number>
🏷️ <dimension>

<explanation of the issue>

Suggested comment:
> <the exact text that would be posted as an inline comment on the PR>
```

Then ask the user to choose an action using AskUserQuestion:

- **Report** — include this finding in the PR review exactly as shown
- **Edit & Report** — let the user modify the comment text, then include it
- **Dismiss** — skip this finding, do not include it in the review

Collect all "Report" and "Edit & Report" findings into a list for Step 5.

---

## Step 5: Review Summary & Confirmation

After all findings have been triaged, display a summary:

```
## Review Summary
Critical: <n reported> / <n found>
Important: <n reported> / <n found>
Suggestion: <n reported> / <n found>
Total reporting: <n> | Dismissed: <n>
Review type: <REQUEST_CHANGES | COMMENT | APPROVE>
```

**Review type logic:**
- Any **Critical** findings being reported → `REQUEST_CHANGES`
- Only **Important** or **Suggestion** findings → `COMMENT`
- No findings being reported (all dismissed or none found) → offer choice between `APPROVE` and skipping the review entirely

Ask the user to confirm before submitting:
- **Submit review** — post to GitHub
- **Cancel** — abort without posting

---

## Step 6: Submit Review

Use `mcp__github__create_pull_request_review` to post the review.

**Parameters:**
- `owner` and `repo` — from Step 1
- `pull_number` — from Step 1
- `commit_id` — the head commit SHA saved in Step 2
- `event` — the review type from Step 5
- `body` — a summary body, for example:

  ```
  ## Code Review Summary

  **<n> findings** (<n> critical, <n> important, <n> suggestions)

  Reviewed <n> changed files against: code quality, project conventions, architecture, and security.
  ```

- `comments` — array of inline comments, each with:
  - `path` — relative file path
  - `line` — the line number in the file
  - `body` — the comment text (prefixed with severity, e.g. `**[Critical]** <comment>`)

**After submission**, confirm success and print a link to the review on GitHub.

**If submission fails**, show the error and offer to retry or abort.

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| PR is merged/closed | Warn the user, offer read-only analysis (no review posted) |
| PR has no changed files | Report this and stop |
| All findings dismissed | Offer to approve or skip |
| CI is failing | Note it in the summary card, proceed with code review |
| PR is from a fork | MCP tools work the same — use the base repo's owner/repo |
| Very large PR (20+ files) | Warn about scope, proceed with analysis, prioritize critical findings |
| User provides invalid PR number | Stop with a clear error message |

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using `position` instead of `line` for comments | Use `line` (file line number), not `position` (diff offset) |
| Forgetting `commit_id` on review submission | Always pass the head SHA from `get_pull_request` response |
| Posting duplicate feedback | Check existing reviews/comments before recording findings |
| Nitpicking style in PRs with critical bugs | Present critical findings first — style issues are lowest priority |
| Posting a review on a merged PR | Check PR state first, warn and offer read-only mode |
