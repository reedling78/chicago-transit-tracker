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
 * Two patches are applied together (belt + suspenders):
 *
 * 1. Inject `use_modular_headers!` into the Expo target block, immediately
 *    after `use_expo_modules!`. This forces every pod (including React-Core)
 *    to build with modular headers, so the non-modular import RNFB does is
 *    no longer non-modular. This is the documented fix in the
 *    @react-native-firebase + Expo issue tracker.
 *
 * 2. Extend Expo's existing `post_install` block so it also flips
 *    `CLANG_WARN_NON_MODULAR_INCLUDE_IN_FRAMEWORK_MODULE = NO` on every
 *    RNFB-prefixed Pods target. Insurance in case (1) doesn't reach a
 *    particular target.
 *
 * Earlier iterations of this plugin appended a *second* top-level
 * `post_install` block. CocoaPods only honors one per Podfile and silently
 * discards the rest, which replaced Expo's `react_native_post_install(...)`
 * setup. Hence: inject inside the existing block.
 *
 * See: https://github.com/invertase/react-native-firebase/issues/7172
 */
const { withDangerousMod } = require('@expo/config-plugins')
const fs = require('fs')
const path = require('path')

const MARKER = '# rnfb-static-frameworks-fix'
const USE_MODULAR_HEADERS = '  use_modular_headers!'

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

// `use_expo_modules!` lives on its own line at the top of the Expo target block.
const USE_EXPO_MODULES = /^\s*use_expo_modules!\s*$/m

module.exports = function withRnfbStaticFrameworksFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile')
      const original = fs.readFileSync(podfilePath, 'utf8')

      if (original.includes(MARKER)) {
        return config
      }

      // Patch 1: inject `use_modular_headers!` after `use_expo_modules!`.
      const expoModulesMatch = original.match(USE_EXPO_MODULES)
      if (!expoModulesMatch) {
        throw new Error(
          'withRnfbStaticFrameworksFix: could not find `use_expo_modules!` in the generated Podfile. The Expo template may have changed; update the regex.',
        )
      }
      const expoModulesEnd = expoModulesMatch.index + expoModulesMatch[0].length
      let patched =
        original.slice(0, expoModulesEnd) +
        '\n' +
        USE_MODULAR_HEADERS +
        original.slice(expoModulesEnd)

      // Patch 2: inject the per-target CLANG_WARN suppression inside the
      // existing post_install block, after `react_native_post_install(...)`.
      const postInstallMatch = patched.match(REACT_NATIVE_POST_INSTALL)
      if (!postInstallMatch) {
        throw new Error(
          'withRnfbStaticFrameworksFix: could not find the Expo `react_native_post_install(...)` call in the generated Podfile. The Expo template may have changed; update the regex.',
        )
      }
      const postInstallEnd = postInstallMatch.index + postInstallMatch[0].length
      patched = patched.slice(0, postInstallEnd) + '\n' + INNER_HOOK + patched.slice(postInstallEnd)

      fs.writeFileSync(podfilePath, patched, 'utf8')
      return config
    },
  ])
}
