/**
 * Expo config plugin: patch the generated iOS Podfile so @react-native-firebase
 * pods compile under `use_frameworks! :static`.
 *
 * Background: with static frameworks, Clang treats
 * `-Wnon-modular-include-in-framework-module` as an error. The RNFB ObjC++
 * pods (`RNFBApp` and friends) and Firebase's own pods (`FirebaseCore`,
 * `GoogleUtilities`, ...) include React Core / Firebase headers as
 * non-modular imports, which then fails the static-framework build.
 *
 * Earlier iterations of this plugin tried two things that did NOT work:
 *
 *   1. Injecting `use_modular_headers!` after `use_expo_modules!`. Six EAS
 *      builds with this directive still failed with the same compile error,
 *      because `use_react_native!(...)` (Expo's autolinker entry point)
 *      doesn't honor it for React-Core under static frameworks.
 *
 *   2. Setting `CLANG_WARN_NON_MODULAR_INCLUDE_IN_FRAMEWORK_MODULE = NO` on
 *      RNFB targets in post_install. This only suppresses the *warning*
 *      escalation; the underlying check still rejects the non-modular
 *      include during modulemap generation.
 *
 * The fix that actually works (per Gemini consult after the sixth EAS
 * failure): set `CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES = YES`
 * on every RNFB / Firebase / Google pod target in post_install. This is the
 * build setting that actually *permits* non-modular includes inside framework
 * modules, rather than just demoting the warning.
 *
 * CocoaPods only honors ONE `post_install` block per Podfile — declaring a
 * second one silently overrides the first. Expo's template's post_install
 * calls `react_native_post_install(...)` which does critical setup (ccache,
 * mac_catalyst, etc.) — replacing it breaks `pod install`. So we INJECT
 * inside the existing block instead of appending a new one.
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
      if target.name.start_with?("RNFB") || target.name.start_with?("Firebase") || target.name.start_with?("Google")
        target.build_configurations.each do |config|
          config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
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

      const postInstallMatch = original.match(REACT_NATIVE_POST_INSTALL)
      if (!postInstallMatch) {
        throw new Error(
          'withRnfbStaticFrameworksFix: could not find the Expo `react_native_post_install(...)` call in the generated Podfile. The Expo template may have changed; update the regex.',
        )
      }

      const postInstallEnd = postInstallMatch.index + postInstallMatch[0].length
      const patched =
        original.slice(0, postInstallEnd) + '\n' + INNER_HOOK + original.slice(postInstallEnd)

      fs.writeFileSync(podfilePath, patched, 'utf8')
      return config
    },
  ])
}
