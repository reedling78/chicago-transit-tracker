/**
 * @jest-environment node
 */
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const withRnfbStaticFrameworksFix = require('../../plugins/withRnfbStaticFrameworksFix.js')

type DangerousMod = (config: {
  modRequest: { platformProjectRoot: string }
}) => Promise<unknown> | unknown

let captured: { mod: DangerousMod } | null = null

jest.mock('@expo/config-plugins', () => ({
  withDangerousMod: (config: unknown, [platform, mod]: ['ios', DangerousMod]) => {
    captured = { mod }
    void platform
    return config
  },
}))

// Minimal stand-in for the Podfile shape Expo SDK 54 generates. Captures the
// shape we depend on: a target block containing a single post_install block
// that calls react_native_post_install(...).
const PODFILE_TEMPLATE = `
target 'MyApp' do
  use_expo_modules!

  post_install do |installer|
    react_native_post_install(
      installer,
      config[:reactNativePath],
      :mac_catalyst_enabled => false,
      :ccache_enabled => ccache_enabled?(podfile_properties),
    )
  end
end
`

async function runPlugin(podfileContents: string): Promise<string> {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rnfb-plugin-test-'))
  const podfilePath = path.join(tmp, 'Podfile')
  fs.writeFileSync(podfilePath, podfileContents, 'utf8')

  withRnfbStaticFrameworksFix({})
  if (!captured) throw new Error('plugin did not register a dangerous mod')
  await captured.mod({ modRequest: { platformProjectRoot: tmp } })

  return fs.readFileSync(podfilePath, 'utf8')
}

beforeEach(() => {
  captured = null
})

describe('withRnfbStaticFrameworksFix', () => {
  it('injects the build-setting override INSIDE the existing post_install block', async () => {
    const result = await runPlugin(PODFILE_TEMPLATE)

    // Hook lands after react_native_post_install and before the closing `end`
    // of the post_install block. We assert ordering by index.
    const reactNativeIdx = result.indexOf('react_native_post_install')
    const markerIdx = result.indexOf('rnfb-static-frameworks-fix')
    const postInstallEndIdx = result.indexOf('end\nend') // close of post_install + close of target

    expect(reactNativeIdx).toBeGreaterThan(-1)
    expect(markerIdx).toBeGreaterThan(reactNativeIdx)
    expect(postInstallEndIdx).toBeGreaterThan(markerIdx)
  })

  it('does NOT append a second top-level post_install block', async () => {
    const result = await runPlugin(PODFILE_TEMPLATE)
    const postInstallCount = (result.match(/post_install do \|installer\|/g) ?? []).length
    expect(postInstallCount).toBe(1)
  })

  it('scopes the build setting to RNFB-prefixed Pods targets only', async () => {
    const result = await runPlugin(PODFILE_TEMPLATE)
    expect(result).toMatch(/target\.name\.start_with\?\("RNFB"\)/)
    expect(result).toMatch(/CLANG_WARN_NON_MODULAR_INCLUDE_IN_FRAMEWORK_MODULE'\] = 'NO'/)
  })

  it('is idempotent — re-running the plugin does not duplicate the hook', async () => {
    const once = await runPlugin(PODFILE_TEMPLATE)
    const twice = await runPlugin(once)
    const markerCount = (twice.match(/rnfb-static-frameworks-fix/g) ?? []).length
    expect(markerCount).toBe(1)
  })

  it('throws a useful error if the Expo Podfile template changes shape', async () => {
    await expect(runPlugin('# no post_install here\n')).rejects.toThrow(
      /could not find the Expo `react_native_post_install/,
    )
  })
})
