#!/usr/bin/env node
/**
 * Bumps the mobile app's version + iOS buildNumber + Android versionCode in
 * apps/mobile/app.json by one patch step, then commits ONLY that file.
 *
 * Usage:
 *   node ./scripts/bump-version.mjs           # bump + commit
 *   node ./scripts/bump-version.mjs --no-commit
 *
 * The pure increment logic lives in ./bump-version.lib.cjs and is unit-tested.
 */

import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { bumpExpoConfig } = require('./bump-version.lib.cjs')

const __dirname = dirname(fileURLToPath(import.meta.url))
const mobileDir = resolve(__dirname, '..')
const repoRoot = resolve(mobileDir, '..', '..')
const appJsonPath = resolve(mobileDir, 'app.json')
const appJsonRepoPath = 'apps/mobile/app.json'

const noCommit = process.argv.includes('--no-commit')

function runAt(cwd, cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', cwd, ...opts })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

function captureStdout(cwd, cmd, args) {
  const result = spawnSync(cmd, args, { encoding: 'utf8', cwd })
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} failed: ${result.stderr}`)
  }
  return result.stdout.trim()
}

const raw = readFileSync(appJsonPath, 'utf8')
const config = JSON.parse(raw)
const next = bumpExpoConfig(config)

const trailingNewline = raw.endsWith('\n') ? '\n' : ''
writeFileSync(appJsonPath, JSON.stringify(next, null, 2) + trailingNewline)

// JSON.stringify multi-lines arrays unconditionally, but the project's
// Prettier config keeps short arrays inline. Normalize formatting so the
// post-bump file is always lint-clean.
runAt(mobileDir, 'npx', ['--no-install', 'prettier', '--log-level=warn', '--write', 'app.json'])

const newVersion = next.expo.version
const newBuildNumber = next.expo.ios.buildNumber
console.log(`Bumped to ${newVersion} (${newBuildNumber})`)

if (noCommit) {
  console.log('Skipping commit (--no-commit).')
  process.exit(0)
}

// Run git from the repo root so pathspecs resolve against the worktree root,
// matching how `git status -- <repo-rel-path>` is normally invoked.
const status = captureStdout(repoRoot, 'git', ['status', '--porcelain', '--', appJsonRepoPath])
if (!status) {
  console.log('No changes to app.json — nothing to commit.')
  process.exit(0)
}

runAt(repoRoot, 'git', ['add', '--', appJsonRepoPath])
runAt(repoRoot, 'git', ['commit', '-m', `chore(mobile): bump to ${newVersion} (${newBuildNumber})`])
