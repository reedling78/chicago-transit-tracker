# Design Spec: `/review-pr` Skill

**Date:** 2026-04-15
**Status:** Draft

---

## Context

The team uses Claude Code for development workflows and has existing skills for shipping code (`ship-it`), writing articles, and managing station images. What's missing is a skill for **reviewing incoming PRs** — reading a GitHub PR, analyzing the diff against project standards, and posting a formal code review with inline comments.

This is different from the existing `superpowers:requesting-code-review` skill (which reviews your own work before merging). This skill is for reviewing **someone else's PR** from a GitHub URL, triaging findings interactively, and posting a formal GitHub PR review.

---

## Invocation

```
/review-pr <github-pr-url>
```

**Accepted URL formats:**
- `https://github.com/owner/repo/pull/123`
- `owner/repo#123`
- `123` (assumes current repo via `git remote get-url origin`)

If no argument is provided, the skill asks for a PR URL.

---

## Workflow

### Step 1: Parse Input

Extract `owner`, `repo`, and `PR number` from the provided URL/reference. For bare numbers, derive owner/repo from the local git remote.

### Step 2: Gather Context

Fetch full PR context using GitHub MCP tools:

| MCP Tool | Data |
|----------|------|
| `mcp__github__get_pull_request` | Title, body, author, base/head branches, state |
| `mcp__github__get_pull_request_files` | Changed files with patch diffs |
| `mcp__github__get_pull_request_status` | CI check results (pass/fail/pending) |
| `mcp__github__get_pull_request_reviews` | Existing reviews |
| `mcp__github__get_pull_request_comments` | Existing inline comments |

Display a **PR Summary Card**:

```
## PR #123: <title>
Author: @<author> | Base: <base> ← <head>
Files changed: <n> | +<additions> / -<deletions>
CI: <status summary>
Existing reviews: <n> | Comments: <n>
```

Also read the project's CLAUDE.md and rules files (if the repo is checked out locally) to inform convention checks.

### Step 3: Analyze

Review each changed file against **4 dimensions**:

1. **Code quality & bugs** — Logic errors, edge cases, null safety, error handling gaps, complexity, naming
2. **Project conventions** — CLAUDE.md rules, TypeScript strict mode, path aliases, server/client boundaries, Tailwind patterns, testing requirements
3. **Architecture & design** — Component boundaries, separation of concerns, data flow, abstraction level
4. **Security** — Secrets exposure, injection risks, client/server boundary violations, unsafe external API calls, missing input validation

**Severity levels:**
- **Critical** — Bugs, security vulnerabilities, data loss risks. Must fix before merge.
- **Important** — Convention violations, architectural concerns, missing tests. Should fix.
- **Suggestion** — Style improvements, alternative approaches, minor optimizations. Nice to have.

Skip issues already flagged in existing reviews/comments (deduplication).

### Step 4: Interactive Triage

Present findings **one at a time**, ordered by severity (critical first):

```
### [Critical] <title>
📁 <file>:<line>

<explanation>

Suggested comment:
> <the comment that would be posted on the PR>
```

For each finding, the user chooses:
- **Report** — include in the PR review as-is
- **Edit & Report** — modify the comment text, then include it
- **Dismiss** — skip this finding

### Step 5: Review Summary & Confirmation

After all findings are triaged, show a summary:

```
Review summary: <n> critical, <n> important, <n> suggestion
Reporting: <n> findings | Dismissed: <n>
Review type: REQUEST_CHANGES / COMMENT / APPROVE
```

Ask for confirmation before submitting.

### Step 6: Submit Review

Use `mcp__github__create_pull_request_review` to post the review.

**Review type logic:**
- Any **Critical** findings reported → `REQUEST_CHANGES`
- Only **Important** or **Suggestion** findings → `COMMENT`
- No findings reported → offer to `APPROVE` or skip

The review body contains a severity summary. Each reported finding is attached as an inline comment on the specific file and line.

If all findings were dismissed and the code looks clean, ask whether to submit an `APPROVE` review or skip posting entirely.

---

## MCP Tools Required

- `mcp__github__get_pull_request`
- `mcp__github__get_pull_request_files`
- `mcp__github__get_pull_request_status`
- `mcp__github__get_pull_request_reviews`
- `mcp__github__get_pull_request_comments`
- `mcp__github__create_pull_request_review`

---

## Skill File Location

`.claude/skills/review-pr/SKILL.md`

---

## Verification

1. Run `/review-pr` on an open PR in this repo
2. Verify the PR summary card displays correctly
3. Verify findings are presented one-by-one with correct severity
4. Test "Report", "Edit & Report", and "Dismiss" actions
5. Verify the submitted review appears on GitHub with correct inline comments
6. Test with a clean PR to verify the approve/skip flow
7. Test URL parsing with all 3 formats (full URL, owner/repo#N, bare number)
