/**
 * Expo config plugin: patch the generated iOS Podfile so @react-native-firebase
 * pods compile under `use_frameworks! :static`.
 *
 * Background: with static frameworks, Clang promotes
 * `-Wnon-modular-include-in-framework-module` to an error. The RNFB ObjC++
 * pods (`RNFBApp` and friends) include React Core headers
 * (`<React/RCTConvert.h>`, `<React/RCTBridgeModule.h>`,
 * `<React/RCTEventEmitter.h>`) as non-modular imports, which fails the build.
 *
 * Fix: append a `post_install` hook that sets
 * `CLANG_WARN_NON_MODULAR_INCLUDE_IN_FRAMEWORK_MODULE = NO` on every RNFB-prefixed
 * Pods target. Scoped narrowly so we don't suppress the warning anywhere else.
 *
 * Without this, EAS iOS build fails at the "Run fastlane" phase compiling
 * RNFBApp.RCTConvert_FIRApp et al. See:
 *   https://github.com/invertase/react-native-firebase/issues/7172
 */
const { withDangerousMod } = require('@expo/config-plugins')
const fs = require('fs')
const path = require('path')

const HOOK_MARKER = '# rnfb-static-frameworks-fix'

const HOOK = `
${HOOK_MARKER}
post_install do |installer|
  installer.pods_project.targets.each do |target|
    if target.name.start_with?("RNFB")
      target.build_configurations.each do |config|
        config.build_settings['CLANG_WARN_NON_MODULAR_INCLUDE_IN_FRAMEWORK_MODULE'] = 'NO'
      end
    end
  end
end
`

module.exports = function withRnfbStaticFrameworksFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile')
      const original = fs.readFileSync(podfilePath, 'utf8')
      if (original.includes(HOOK_MARKER)) {
        return config
      }
      // Append the hook at the end of the file. CocoaPods supports multiple
      // `post_install` blocks; they all run in order.
      fs.writeFileSync(podfilePath, original.trimEnd() + '\n' + HOOK + '\n', 'utf8')
      return config
    },
  ])
}
