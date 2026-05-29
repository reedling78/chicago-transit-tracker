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
 * Iteration history (nine EAS builds in):
 *
 *   - `CLANG_WARN_NON_MODULAR_INCLUDE_IN_FRAMEWORK_MODULE = NO` only suppresses
 *     the warning escalation; the underlying check still rejects the include.
 *   - `CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES = YES` on RNFB
 *     targets clears the non-modular-include rejection but then exposes a
 *     follow-on error: `declaration of 'RCTBridgeModule' must be imported
 *     from module 'RNFBApp.RNFBAppModule' before it is required`. RNFB still
 *     sees React-Core as not-a-module.
 *   - `use_modular_headers!` at the Podfile level doesn't take effect under
 *     `use_frameworks: static` with Expo's `use_react_native!(...)` — the
 *     autolinker overrides it for React-Core specifically.
 *
 * The combination that actually works (Gemini follow-up consult, attempt 9):
 *   1. `use_modular_headers!` in the target block (Patch 1).
 *   2. `CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES = YES` on
 *      RNFB / Firebase / Google pod targets in post_install (Patch 2a).
 *   3. `DEFINES_MODULE = YES` on `React-Core` / `ReactCommon` / `RCTRequired`
 *      in post_install (Patch 2b) — this is the lever that actually forces
 *      Xcode to emit a Clang modulemap for React-Core, fixing the
 *      `RCTBridgeModule must be imported from module ...` error.
 *
 * CocoaPods only honors ONE `post_install` block per Podfile — declaring a
 * second silently overrides the first. Expo's template's post_install calls
 * `react_native_post_install(...)` which does critical setup (ccache,
 * mac_catalyst, etc.) — replacing it breaks `pod install`. So we INJECT
 * inside the existing block instead of appending a new one.
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
      # Permit non-modular includes inside RNFB / Firebase / Google framework modules.
      # Without this, Clang rejects the include of React-Core headers from RNFB pods.
      if target.name.start_with?("RNFB") || target.name.start_with?("Firebase") || target.name.start_with?("Google")
        target.build_configurations.each do |config|
          config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        end
      end

      # Force React-Core (and friends) to emit a Clang modulemap so that
      # \`#import <React/RCTBridgeModule.h>\` from RNFB resolves to a real
      # module reference. The Podfile-level directive at the top of this target
      # block doesn't take effect for React-Core under static frameworks.
      if target.name == "React-Core" || target.name == "ReactCommon" || target.name == "RCTRequired"
        target.build_configurations.each do |config|
          config.build_settings['DEFINES_MODULE'] = 'YES'
          config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
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

      // Patch 1: inject `use_modular_headers!` after `use_expo_modules!` so
      // React-Core is built with a module map. Without this, RNFB's
      // CLANG_ALLOW workaround compiles past the include check but hits
      // "declaration of 'RCTBridgeModule' must be imported from module ..."
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

      // Patch 2: inject the per-target CLANG_ALLOW build setting inside the
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
