/**
 * Expo config plugin: patch the generated iOS Podfile so @react-native-firebase
 * pods compile under `use_frameworks! :static`.
 *
 * Background: with static frameworks, Clang promotes
 * `-Wnon-modular-include-in-framework-module` to an error. The RNFB ObjC++
 * pods (`RNFBApp` and friends) include React Core headers
 * (`<React/RCTConvert.h>`, `<React/RCTBridgeModule.h>`,
 * `<React/RCTEventEmitter.h>`) as non-modular imports, which then fails
 * the static-framework build.
 *
 * Fix: extend the existing Expo `post_install` block with code that flips
 * `CLANG_WARN_NON_MODULAR_INCLUDE_IN_FRAMEWORK_MODULE = NO` on every
 * RNFB-prefixed Pods target. Scoped narrowly so we don't suppress the
 * warning anywhere else.
 *
 * NOTE: CocoaPods only honors ONE `post_install` block per Podfile —
 * declaring a second one silently overrides the first. The Expo
 * template's post_install calls `react_native_post_install(...)` which
 * does critical setup (ccache, mac_catalyst, etc.) — replacing it
 * breaks `pod install`. So we INJECT inside the existing block instead
 * of appending a new one.
 *
 * See: https://github.com/invertase/react-native-firebase/issues/7172
 */
const { withDangerousMod } = require('@expo/config-plugins')
const fs = require('fs')
const path = require('path')

const MARKER = '# rnfb-static-frameworks-fix'

const INNER_HOOK = `
    ${MARKER}
    installer.pods_project.targets.each do |target|
      if target.name.start_with?("RNFB")
        target.build_configurations.each do |config|
          config.build_settings['CLANG_WARN_NON_MODULAR_INCLUDE_IN_FRAMEWORK_MODULE'] = 'NO'
        end
      end
    end
`

// Matches the multi-line `react_native_post_install(...)` call and captures
// the entire call including its closing paren.
const REACT_NATIVE_POST_INSTALL = /react_native_post_install\([\s\S]*?\n\s*\)/

module.exports = function withRnfbStaticFrameworksFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile')
      const original = fs.readFileSync(podfilePath, 'utf8')

      if (original.includes(MARKER)) {
        return config
      }

      const match = original.match(REACT_NATIVE_POST_INSTALL)
      if (!match) {
        throw new Error(
          'withRnfbStaticFrameworksFix: could not find the Expo `react_native_post_install(...)` call in the generated Podfile. The Expo template may have changed; update the regex.',
        )
      }

      const insertAt = match.index + match[0].length
      const patched = original.slice(0, insertAt) + '\n' + INNER_HOOK + original.slice(insertAt)

      fs.writeFileSync(podfilePath, patched, 'utf8')
      return config
    },
  ])
}
