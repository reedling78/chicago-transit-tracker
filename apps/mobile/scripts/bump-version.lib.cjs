/**
 * Pure logic for incrementing the mobile app's version + build numbers.
 *
 * CommonJS so Jest (running through jest-expo / babel-preset-expo) can
 * `require()` it directly without ESM transform config. The .mjs wrapper
 * script consumes this via `createRequire`.
 */

/**
 * Increments the patch component of `expo.version`, the iOS `expo.ios.buildNumber`
 * (string-typed integer), and the Android `expo.android.versionCode` (integer).
 *
 * Returns a deep copy with the three fields bumped. The input is not mutated.
 */
function bumpExpoConfig(config) {
  if (!config || typeof config !== 'object' || !config.expo) {
    throw new Error('bumpExpoConfig: config.expo is required')
  }
  const expo = config.expo

  const version = expo.version
  if (typeof version !== 'string') {
    throw new Error('bumpExpoConfig: expo.version must be a string')
  }
  const versionParts = version.split('.').map((p) => Number.parseInt(p, 10))
  if (versionParts.length !== 3 || versionParts.some((n) => !Number.isFinite(n))) {
    throw new Error(`bumpExpoConfig: expo.version "${version}" must be MAJOR.MINOR.PATCH`)
  }
  const [major, minor, patch] = versionParts

  const iosBuildNumber = expo.ios?.buildNumber
  if (typeof iosBuildNumber !== 'string') {
    throw new Error('bumpExpoConfig: expo.ios.buildNumber must be a string')
  }
  const iosNum = Number.parseInt(iosBuildNumber, 10)
  if (!Number.isFinite(iosNum)) {
    throw new Error(`bumpExpoConfig: expo.ios.buildNumber "${iosBuildNumber}" is not numeric`)
  }

  const androidVersionCode = expo.android?.versionCode
  if (typeof androidVersionCode !== 'number' || !Number.isFinite(androidVersionCode)) {
    throw new Error('bumpExpoConfig: expo.android.versionCode must be a finite number')
  }

  const next = structuredClone(config)
  next.expo.version = `${major}.${minor}.${patch + 1}`
  next.expo.ios.buildNumber = String(iosNum + 1)
  next.expo.android.versionCode = androidVersionCode + 1
  return next
}

module.exports = { bumpExpoConfig }
