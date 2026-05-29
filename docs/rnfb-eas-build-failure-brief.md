# EAS iOS build keeps failing on `@react-native-firebase` — need a fix

## TL;DR

I'm trying to add `@react-native-firebase/analytics` to an Expo SDK 54 app with New Architecture enabled. Every EAS iOS cloud build fails at the compile phase with the same `-Wnon-modular-include-in-framework-module` error against RNFB's pods importing React-Core headers. I've tried six different configurations (RNFB 24.x and 21.x; `use_frameworks: static` + various Podfile patches; `use_modular_headers!`; per-target build settings) and the error is identical every time. The build fails the same way regardless of what I change. **What am I missing?**

## Stack

- Expo SDK 54 (`expo: ~54.0.33`, RN 0.81)
- New Architecture enabled (`newArchEnabled: true` in `app.json`)
- `react-native-screens: ~4.17.1` (pinned for iOS 26 Liquid Glass header opt-out via `unstable_headerLeftItems` / `unstable_headerRightItems`)
- `react-native-firebase`: tried `^24.0.0` and `^21.14.0` — same error on both
- EAS Build via `eas build --profile preview --platform ios --non-interactive`
- pnpm workspaces monorepo (Expo app at `apps/mobile`)
- iOS: real device distribution to internal testers via Firebase App Distribution
- `expo-build-properties` plugin in use, with `ios.useFrameworks: "static"` (per @react-native-firebase docs)

## The error (identical across all six attempts)

```
include of non-modular header inside framework module 'RNFBApp.RCTConvert_FIRApp':
  '/Users/expo/workingdir/build/apps/mobile/ios/Pods/Headers/Public/React-Core/React/RCTConvert.h'
  [-Werror,-Wnon-modular-include-in-framework-module]

include of non-modular header inside framework module 'RNFBApp.RCTConvert_FIROptions':
  '/Users/expo/workingdir/build/apps/mobile/ios/Pods/Headers/Public/React-Core/React/RCTConvert.h'
  [-Werror,-Wnon-modular-include-in-framework-module]

include of non-modular header inside framework module 'RNFBApp.RNFBAppModule':
  '/Users/expo/workingdir/build/apps/mobile/ios/Pods/Headers/Public/React-Core/React/RCTBridgeModule.h'
  [-Werror,-Wnon-modular-include-in-framework-module]

include of non-modular header inside framework module 'RNFBApp.RNFBRCTEventEmitter':
  '/Users/expo/workingdir/build/apps/mobile/ios/Pods/Headers/Public/React-Core/React/RCTEventEmitter.h'
  [-Werror,-Wnon-modular-include-in-framework-module]
```

Plus variations for `RNFBSharedUtils` and `RNFBUtilsModule`, all importing React-Core headers as non-modular.

## What I've tried (in order)

### 1. Baseline install (no patches)
Just `pnpm add @react-native-firebase/app @react-native-firebase/analytics` + reference `@react-native-firebase/app` plugin in `app.json`. Build fails at **"Install pods"** phase. Confirmed standard issue — RNFB requires `use_frameworks!`.

### 2. Add `use_frameworks: static` via `expo-build-properties`
```json
[
  "expo-build-properties",
  { "ios": { "useFrameworks": "static" } }
]
```
`Podfile.properties.json` now contains `"ios.useFrameworks": "static"`. Build now gets past "Install pods" but fails at compile phase with the error above.

### 3. Custom config plugin: append `post_install` hook to disable the warning escalation on RNFB targets
This silently overwrote Expo's own `post_install` block (CocoaPods only honors one — the second silently wins), breaking `react_native_post_install(...)`. Build failed at "Install pods" with "Unknown error".

### 4. Fixed the plugin to **inject inside** Expo's existing `post_install` after `react_native_post_install(...)`
```ruby
# (inside Expo's existing post_install do |installer| ... end)
# rnfb-static-frameworks-fix
installer.pods_project.targets.each do |target|
  if target.name.start_with?("RNFB")
    target.build_configurations.each do |config|
      config.build_settings['CLANG_WARN_NON_MODULAR_INCLUDE_IN_FRAMEWORK_MODULE'] = 'NO'
    end
  end
end
```
Verified locally via `expo prebuild --clean` that the hook lands correctly in the generated Podfile. Build still fails with the same RNFB compile error. Either the targeting (`start_with?("RNFB")`) doesn't match RNFB target names under `use_frameworks!`, or the build setting doesn't propagate to the modulemap-generation phase where the warning is emitted.

### 5. Also inject `use_modular_headers!` into the Podfile target block, right after `use_expo_modules!`
This forces every pod (including React-Core) to build with modular headers. Per @react-native-firebase docs this is the canonical fix when combining with `use_frameworks: static`. Generated Podfile confirms:
```ruby
target 'ChicagoTransitTracker' do
  use_expo_modules!
  use_modular_headers!  # ← my injection
  ...
  use_native_modules!(config_command)
  use_frameworks! :linkage => :static if podfile_properties['ios.useFrameworks']
  use_react_native!(...)
  ...
end
```
Build fails with the same error. **`use_modular_headers!` appears to have no effect** in this context.

### 6. Downgrade `@react-native-firebase` from `^24.0.0` to `^21.14.0`
21.x is what Expo SDK 54 was historically tested with; 22.x added New Arch changes. Build fails with the same error message verbatim.

## Generated Podfile (relevant section after all my patches)

```ruby
target 'ChicagoTransitTracker' do
  use_expo_modules!
  use_modular_headers!

  config_command = [
    'node',
    '-e',
    "require(require.resolve('expo-modules-autolinking', { paths: [require.resolve('expo/package.json')] }))(process.argv.slice(1))",
    'react-native-config',
    '--json',
    '--platform',
    'ios'
  ]

  config = use_native_modules!(config_command)

  use_frameworks! :linkage => podfile_properties['ios.useFrameworks'].to_sym if podfile_properties['ios.useFrameworks']
  use_frameworks! :linkage => ENV['USE_FRAMEWORKS'].to_sym if ENV['USE_FRAMEWORKS']

  use_react_native!(
    :path => config[:reactNativePath],
    :hermes_enabled => podfile_properties['expo.jsEngine'] == nil || podfile_properties['expo.jsEngine'] == 'hermes',
    :app_path => "#{Pod::Config.instance.installation_root}/..",
    :privacy_file_aggregation_enabled => podfile_properties['apple.privacyManifestAggregationEnabled'] != 'false',
  )

  post_install do |installer|
    react_native_post_install(
      installer,
      config[:reactNativePath],
      :mac_catalyst_enabled => false,
      :ccache_enabled => ccache_enabled?(podfile_properties),
    )

    # rnfb-static-frameworks-fix
    installer.pods_project.targets.each do |target|
      if target.name.start_with?("RNFB")
        target.build_configurations.each do |config|
          config.build_settings['CLANG_WARN_NON_MODULAR_INCLUDE_IN_FRAMEWORK_MODULE'] = 'NO'
        end
      end
    end

  end
end
```

`Podfile.properties.json`:
```json
{
  "expo.jsEngine": "hermes",
  "EX_DEV_CLIENT_NETWORK_INSPECTOR": "true",
  "newArchEnabled": "true",
  "ios.useFrameworks": "static",
  "ios.forceStaticLinking": "[]",
  "apple.privacyManifestAggregationEnabled": "true",
  "EXPO_USE_PRECOMPILED_MODULES": "true"
}
```

## app.json plugins block

```json
"plugins": [
  "expo-router",
  "expo-web-browser",
  "expo-apple-authentication",
  "@react-native-firebase/app",
  [
    "expo-build-properties",
    { "ios": { "useFrameworks": "static" } }
  ],
  "./plugins/withRnfbStaticFrameworksFix.js"
]
```

## My specific questions

1. **Why doesn't `use_modular_headers!` make React-Core modular** in the eyes of the RNFB framework module being compiled? Is there a CocoaPods quirk where `use_modular_headers!` only applies to pods declared *after* it, and `use_react_native!(...)` ignores it?
2. **Is the per-target `CLANG_WARN_NON_MODULAR_INCLUDE_IN_FRAMEWORK_MODULE = NO` happening too late?** The warning is fired during modulemap generation, which may be before `post_install` runs. If so, where's the right place to disable that warning?
3. **What's the current canonical recipe** for `@react-native-firebase/app` + `@react-native-firebase/analytics` on Expo SDK 54 with New Architecture + iOS? I cannot find a single recent (post-Oct 2025) example that builds successfully on EAS Cloud.
4. Is there a known-good `expo-build-properties` config (`useFrameworks`, `forceStaticLinking`, `extraPods` with `modular_headers: true` on specific pods?) that resolves this?
5. Should I be passing `:modular_headers => true` to individual pods like `pod 'React-Core', :modular_headers => true`? If so, how do I do that from an Expo config plugin (Expo's autolinking generates the `pod 'React-Core'` declaration, not me)?
6. Has anyone gotten `@react-native-firebase` to compile on Expo SDK 54 + `newArchEnabled: true` + EAS, period? If so, what's the minimal repro config?

## What I'm NOT willing to do

- Eject from Expo to bare React Native (too disruptive)
- Disable New Architecture (would regress the iOS 26 Liquid Glass header opt-out we ship via `react-native-screens@4.17.1`'s `unstable_headerLeftItems` / `unstable_headerRightItems`, which only works under new arch)

## What I AM willing to do

- Add more config plugins
- Pin to specific RNFB versions
- Patch the Podfile in arbitrary ways
- Switch to `use_frameworks: dynamic` if there's evidence Firebase will still link
- Use a completely different mobile analytics approach (e.g., GA4 Measurement Protocol over plain HTTP — no native module at all)

If the answer is "this combination is fundamentally broken and there's no working configuration," I want to know that too so I can pivot to the last bullet.
