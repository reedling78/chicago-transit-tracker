// @ts-expect-error — plain CommonJS helper, no .d.ts
import { bumpExpoConfig } from '../../scripts/bump-version.lib.cjs'

interface ExpoConfig {
  expo: {
    version: string
    ios: { buildNumber: string }
    android: { versionCode: number }
    [key: string]: unknown
  }
}

function makeConfig(overrides: Partial<ExpoConfig['expo']> = {}): ExpoConfig {
  return {
    expo: {
      name: 'Chicago Transit Tracker',
      slug: 'chicago-transit-tracker',
      version: '1.0.0',
      ios: { buildNumber: '1', bundleIdentifier: 'com.chicagotransittracker.app' },
      android: { versionCode: 1, package: 'com.chicagotransittracker.app' },
      ...overrides,
    },
  }
}

describe('bumpExpoConfig', () => {
  it('patch-bumps version, iOS buildNumber, and Android versionCode together', () => {
    const next = bumpExpoConfig(makeConfig())
    expect(next.expo.version).toBe('1.0.1')
    expect(next.expo.ios.buildNumber).toBe('2')
    expect(next.expo.android.versionCode).toBe(2)
  })

  it('handles double-digit patch and build numbers', () => {
    const next = bumpExpoConfig(
      makeConfig({
        version: '1.2.9',
        ios: { buildNumber: '99' },
        android: { versionCode: 99 },
      }),
    )
    expect(next.expo.version).toBe('1.2.10')
    expect(next.expo.ios.buildNumber).toBe('100')
    expect(next.expo.android.versionCode).toBe(100)
  })

  it('preserves all other fields verbatim', () => {
    const config = makeConfig({
      orientation: 'portrait',
      icon: './assets/icon.png',
      ios: {
        buildNumber: '1',
        bundleIdentifier: 'com.chicagotransittracker.app',
        supportsTablet: true,
      },
      android: {
        versionCode: 1,
        package: 'com.chicagotransittracker.app',
        edgeToEdgeEnabled: true,
      },
    })
    const next = bumpExpoConfig(config)
    expect(next.expo.name).toBe('Chicago Transit Tracker')
    expect(next.expo.slug).toBe('chicago-transit-tracker')
    expect(next.expo.orientation).toBe('portrait')
    expect(next.expo.icon).toBe('./assets/icon.png')
    expect((next.expo.ios as { bundleIdentifier: string }).bundleIdentifier).toBe(
      'com.chicagotransittracker.app',
    )
    expect((next.expo.ios as { supportsTablet: boolean }).supportsTablet).toBe(true)
    expect((next.expo.android as { package: string }).package).toBe('com.chicagotransittracker.app')
    expect((next.expo.android as { edgeToEdgeEnabled: boolean }).edgeToEdgeEnabled).toBe(true)
  })

  it('does not mutate the input config', () => {
    const config = makeConfig()
    const before = JSON.stringify(config)
    bumpExpoConfig(config)
    expect(JSON.stringify(config)).toBe(before)
  })

  it('throws when version is malformed', () => {
    expect(() => bumpExpoConfig(makeConfig({ version: 'v1.0' }))).toThrow(/MAJOR\.MINOR\.PATCH/)
    expect(() => bumpExpoConfig(makeConfig({ version: '1.0' }))).toThrow(/MAJOR\.MINOR\.PATCH/)
    expect(() => bumpExpoConfig(makeConfig({ version: '1.0.x' }))).toThrow(/MAJOR\.MINOR\.PATCH/)
  })

  it('throws when iOS buildNumber is missing or non-numeric', () => {
    expect(() =>
      bumpExpoConfig({
        expo: {
          version: '1.0.0',
          ios: {} as { buildNumber: string },
          android: { versionCode: 1 },
        },
      }),
    ).toThrow(/buildNumber must be a string/)
    expect(() => bumpExpoConfig(makeConfig({ ios: { buildNumber: 'foo' } }))).toThrow(/not numeric/)
  })

  it('throws when Android versionCode is missing or not a number', () => {
    expect(() =>
      bumpExpoConfig({
        expo: {
          version: '1.0.0',
          ios: { buildNumber: '1' },
          android: {} as { versionCode: number },
        },
      }),
    ).toThrow(/versionCode must be a finite number/)
    expect(() =>
      bumpExpoConfig(
        // simulate JSON read with string field
        makeConfig({ android: { versionCode: '2' as unknown as number } }),
      ),
    ).toThrow(/versionCode must be a finite number/)
  })

  it('throws when expo is missing', () => {
    // @ts-expect-error — intentionally malformed input
    expect(() => bumpExpoConfig({})).toThrow(/config\.expo is required/)
    // @ts-expect-error — intentionally malformed input
    expect(() => bumpExpoConfig(null)).toThrow(/config\.expo is required/)
  })
})
