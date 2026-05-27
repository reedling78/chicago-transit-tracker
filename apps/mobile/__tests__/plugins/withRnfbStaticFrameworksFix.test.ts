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

function runPlugin(podfileContents: string): string {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rnfb-plugin-test-'))
  const podfilePath = path.join(tmp, 'Podfile')
  fs.writeFileSync(podfilePath, podfileContents, 'utf8')

  withRnfbStaticFrameworksFix({})
  if (!captured) throw new Error('plugin did not register a dangerous mod')
  captured.mod({ modRequest: { platformProjectRoot: tmp } })

  return fs.readFileSync(podfilePath, 'utf8')
}

beforeEach(() => {
  captured = null
})

describe('withRnfbStaticFrameworksFix', () => {
  it('appends the CLANG_WARN_NON_MODULAR post_install hook scoped to RNFB targets', () => {
    const result = runPlugin('target "myApp" do\nend\n')
    expect(result).toMatch(/rnfb-static-frameworks-fix/)
    expect(result).toMatch(/post_install do \|installer\|/)
    expect(result).toMatch(/target\.name\.start_with\?\("RNFB"\)/)
    expect(result).toMatch(/CLANG_WARN_NON_MODULAR_INCLUDE_IN_FRAMEWORK_MODULE'\] = 'NO'/)
  })

  it('is idempotent — re-running the plugin does not duplicate the hook', () => {
    const initial = runPlugin('target "myApp" do\nend\n')
    const podfilePath = path.join(
      // captured was reset by beforeEach; just call runPlugin again on the same temp dir
      // by reusing the result via a fresh dir is fine — idempotency is about marker text.
      fs.mkdtempSync(path.join(os.tmpdir(), 'rnfb-plugin-test-')),
      'Podfile',
    )
    fs.writeFileSync(podfilePath, initial, 'utf8')
    withRnfbStaticFrameworksFix({})
    captured!.mod({ modRequest: { platformProjectRoot: path.dirname(podfilePath) } })
    const after = fs.readFileSync(podfilePath, 'utf8')
    const markerCount = (after.match(/rnfb-static-frameworks-fix/g) ?? []).length
    expect(markerCount).toBe(1)
  })
})
