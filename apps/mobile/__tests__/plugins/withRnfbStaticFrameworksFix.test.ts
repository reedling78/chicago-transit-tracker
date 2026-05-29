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

  it('uses CLANG_ALLOW (not CLANG_WARN) — the build setting that actually permits non-modular includes', async () => {
    const result = await runPlugin(PODFILE_TEMPLATE)
    expect(result).toMatch(/CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'\] = 'YES'/)
    // Make sure we didn't keep the old (ineffective) CLANG_WARN setting around.
    expect(result).not.toMatch(/CLANG_WARN_NON_MODULAR_INCLUDE_IN_FRAMEWORK_MODULE/)
  })

  it('scopes the CLANG_ALLOW build setting to RNFB / Firebase / Google pod targets', async () => {
    const result = await runPlugin(PODFILE_TEMPLATE)
    expect(result).toMatch(/target\.name\.start_with\?\("RNFB"\)/)
    expect(result).toMatch(/target\.name\.start_with\?\("Firebase"\)/)
    expect(result).toMatch(/target\.name\.start_with\?\("Google"\)/)
  })

  it('forces DEFINES_MODULE = YES on React-Core / ReactCommon / RCTRequired', async () => {
    const result = await runPlugin(PODFILE_TEMPLATE)
    // The lever that actually makes Xcode emit a Clang modulemap for React-Core
    // so RNFB's `#import <React/RCTBridgeModule.h>` resolves to a real module.
    expect(result).toMatch(/target\.name == "React-Core"/)
    expect(result).toMatch(/target\.name == "ReactCommon"/)
    expect(result).toMatch(/target\.name == "RCTRequired"/)
    expect(result).toMatch(/DEFINES_MODULE'\] = 'YES'/)
  })

  it('injects use_modular_headers! after use_expo_modules! — needed so React-Core has a module map', async () => {
    const result = await runPlugin(PODFILE_TEMPLATE)
    const expoModulesIdx = result.indexOf('use_expo_modules!')
    const modularHeadersIdx = result.indexOf('use_modular_headers!')
    expect(expoModulesIdx).toBeGreaterThan(-1)
    expect(modularHeadersIdx).toBeGreaterThan(expoModulesIdx)
  })

  it('is idempotent — re-running the plugin does not duplicate either patch', async () => {
    const once = await runPlugin(PODFILE_TEMPLATE)
    const twice = await runPlugin(once)
    // Compare counts: re-running must not increase any occurrence count.
    const countOnce = {
      marker: (once.match(/rnfb-static-frameworks-fix/g) ?? []).length,
      clangAllow: (once.match(/CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES/g) ?? [])
        .length,
      modularHeaders: (once.match(/use_modular_headers!/g) ?? []).length,
      definesModule: (once.match(/DEFINES_MODULE/g) ?? []).length,
    }
    expect((twice.match(/rnfb-static-frameworks-fix/g) ?? []).length).toBe(countOnce.marker)
    expect(
      (twice.match(/CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES/g) ?? []).length,
    ).toBe(countOnce.clangAllow)
    expect((twice.match(/use_modular_headers!/g) ?? []).length).toBe(countOnce.modularHeaders)
    expect((twice.match(/DEFINES_MODULE/g) ?? []).length).toBe(countOnce.definesModule)
    // And the first run must have produced exactly one marker + use_modular_headers!.
    expect(countOnce.marker).toBe(1)
    expect(countOnce.modularHeaders).toBe(1)
  })

  it('throws a useful error if use_expo_modules! is missing from the template', async () => {
    await expect(
      runPlugin(
        'target "MyApp" do\n  post_install do |installer|\n    react_native_post_install(\n      installer,\n    )\n  end\nend\n',
      ),
    ).rejects.toThrow(/could not find `use_expo_modules!`/)
  })

  it('throws a useful error if react_native_post_install is missing from the template', async () => {
    await expect(runPlugin('target "MyApp" do\n  use_expo_modules!\nend\n')).rejects.toThrow(
      /could not find the Expo `react_native_post_install/,
    )
  })
})
