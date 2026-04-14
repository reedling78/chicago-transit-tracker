#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { mkdirSync, createWriteStream, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

const __dirname = dirname(fileURLToPath(import.meta.url))
const mobileDir = resolve(__dirname, '..')

const platform = process.argv[2]
if (platform !== 'android' && platform !== 'ios') {
  console.error('Usage: distribute.mjs <android|ios>')
  process.exit(1)
}

const appIdEnv = platform === 'android' ? 'FIREBASE_APP_ID_ANDROID' : 'FIREBASE_APP_ID_IOS'
const appId = process.env[appIdEnv]
if (!appId) {
  console.error(`Missing ${appIdEnv}. Set it in apps/mobile/.env.local (see .env.example).`)
  process.exit(1)
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, { cwd: mobileDir, stdio: 'inherit', ...opts })
  if (result.status !== 0) {
    console.error(`Command failed: ${cmd} ${args.join(' ')}`)
    process.exit(result.status ?? 1)
  }
  return result
}

function capture(cmd, args) {
  const result = spawnSync(cmd, args, { cwd: mobileDir, encoding: 'utf8' })
  if (result.status !== 0) {
    console.error(`Command failed: ${cmd} ${args.join(' ')}\n${result.stderr}`)
    process.exit(result.status ?? 1)
  }
  return result.stdout
}

console.log(`Building ${platform} with EAS (profile: preview)...`)
run('eas', ['build', '--profile', 'preview', '--platform', platform, '--non-interactive'])

console.log('Fetching latest finished build URL...')
const listJson = capture('eas', [
  'build:list',
  '--platform',
  platform,
  '--status',
  'finished',
  '--limit',
  '1',
  '--json',
  '--non-interactive',
])
const builds = JSON.parse(listJson)
const artifactUrl = builds?.[0]?.artifacts?.buildUrl
if (!artifactUrl) {
  console.error('Could not find buildUrl on latest finished build.')
  process.exit(1)
}

const ext = platform === 'android' ? 'apk' : 'ipa'
const artifactsDir = resolve(mobileDir, '.artifacts')
if (!existsSync(artifactsDir)) mkdirSync(artifactsDir, { recursive: true })
const artifactPath = resolve(artifactsDir, `${platform}-latest.${ext}`)

console.log(`Downloading ${artifactUrl} -> ${artifactPath}`)
const response = await fetch(artifactUrl)
if (!response.ok || !response.body) {
  console.error(`Download failed: ${response.status} ${response.statusText}`)
  process.exit(1)
}
await pipeline(Readable.fromWeb(response.body), createWriteStream(artifactPath))

const releaseNotes = capture('git', ['log', '-1', '--pretty=%B', 'HEAD']).trim() || 'Internal build'

console.log('Uploading to Firebase App Distribution...')
run('firebase', [
  'appdistribution:distribute',
  artifactPath,
  '--app',
  appId,
  '--groups',
  'internal',
  '--release-notes',
  releaseNotes,
])

console.log(`\nDone. Firebase Console: https://console.firebase.google.com/project/_/appdistribution`)
