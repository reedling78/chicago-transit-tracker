# Plan: Local Branch Cleanup + Auto-Delete on PR Merge

## Context

`git branch -vv` currently shows **71 local branches** accumulated over the lifetime of this project. CTT uses a `gh pr merge --squash` workflow; GitHub auto-delete is already enabled (per `CLAUDE.md`), so remote branches disappear after merge — but locally the feature branches stick around forever and pile up.

Two things are missing:
1. A one-time wipe of the 70 leftover local branches.
2. An ongoing convention so that, after a PR is merged, the matching local branch gets cleaned up too — without the user having to remember branch names.

Note: most of the 71 branches still show their upstream as `[origin/<name>]` (not `: gone`) because `git fetch --prune` has not been run recently. Only `mobile-metra-train-screen` currently shows `: gone`. The first step of the ongoing cleanup must always be `git fetch --prune` to refresh that view.

## Approach

Three layers, lightest to heaviest:

1. **Global git config** — `fetch.prune = true` so every `git fetch` / `git pull` automatically removes stale remote-tracking refs. (Without this, a branch deleted on GitHub still appears as `origin/<name>` locally.)
2. **Global git alias `git tidy`** — one command that prunes remote refs and force-deletes any local branch whose upstream is gone.
3. **One-time nuclear cleanup** — delete every local branch except `main`, regardless of merge state.

`git tidy` is intentionally conservative: it only removes branches whose upstream is gone (i.e. the matching remote branch has been deleted, which is what GitHub auto-delete does post-merge). It will never touch a branch that still exists on origin or a branch with no upstream.

## Steps

### 1. One-time nuclear cleanup

From the repo root, on `main`:

```bash
git fetch --prune
git branch | grep -vE '^\*|^\s+main$' | xargs -r git branch -D
```

- `-D` (force) is required because squash-merged branches do not show as merged into `main` via `git branch --merged`.
- The user has confirmed they want every non-main local branch gone, so unmerged work loss is acceptable.
- Verify after: `git branch` should show only `* main`.

### 2. Configure global git settings

```bash
git config --global fetch.prune true
git config --global alias.tidy '!git fetch --prune && git branch -vv | awk "/: gone\\]/ {print \$1}" | xargs -r git branch -D'
```

- `fetch.prune = true` is global because the user's whole workflow benefits from it, not just this repo.
- The alias is a single line that:
  1. Prunes remote-tracking refs (`git fetch --prime`).
  2. Lists branches whose upstream is `: gone`.
  3. Force-deletes them.
- `xargs -r` (GNU) / equivalent skips the run when there's nothing to delete. On macOS BSD `xargs`, the `-r` flag works on recent macOS — if this is an issue we can drop it (empty `xargs` is a no-op except for an empty arg warning).

### 3. Update `CLAUDE.md` "Git Workflow" section

Replace the manual `git branch -d <name>` cleanup step with:

```bash
git checkout main && git pull
git tidy   # deletes any local branch whose remote was deleted
```

Add a one-line note that `fetch.prune` is configured globally and the `tidy` alias is available.

## Files to modify

- **No source files.** Only:
  - Global git config (`~/.gitconfig`) — via `git config --global` commands above.
  - `CLAUDE.md` — Git Workflow section (lines ~330-345).

## Verification

1. **Cleanup worked:** `git branch` returns only `* main`.
2. **Config applied:** `git config --global --get fetch.prune` returns `true`. `git config --global --get alias.tidy` returns the alias body.
3. **Alias works on a no-op:** `git tidy` from `main` exits cleanly without deleting anything (since there are no `: gone` branches left).
4. **End-to-end test on the next PR:**
   - Run `/ship-it` to create + push + open a PR.
   - Merge the PR on GitHub (auto-delete fires server-side).
   - Locally: `git checkout main && git pull && git tidy`.
   - `git branch` no longer lists the merged branch.

## Decisions

- **Config scope:** global (`~/.gitconfig`) — same workflow across every repo on this machine.
- **Automation level:** manual `git tidy`. No git hook. Run it after merging a PR (or anytime you want to prune stale local branches).
