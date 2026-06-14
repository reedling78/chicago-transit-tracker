# EAS iOS build — third consult

## TL;DR

Your `DEFINES_MODULE = YES` recommendation made sense, but **EAS attempt #9 produced the exact same error verbatim** as attempts #7 and #8 — the `RCTBridgeModule must be imported from module 'RNFBApp.RNFBAppModule'` cascade. The plugin definitely applied the setting (I verified the post_install block in the generated Podfile locally). Either `DEFINES_MODULE = YES` in post_install doesn't actually cause Xcode to emit a usable modulemap for React-Core under this configuration, or there's a broader scope of pods that need it, or the modulemap *is* being emitted but RNFB isn't picking it up.

I need to know either **(a) what specifically to try next** or **(b) confirmation that this combination genuinely doesn't build, so I can pivot to GA4 Measurement Protocol HTTP**.

## Current state of the plugin (verified in generated Podfile)

```ruby
target 'ChicagoTransitTracker' do
  use_expo_modules!
  use_modular_headers!

  config = use_native_modules!(config_command)
  use_frameworks! :linkage => :static if podfile_properties['ios.useFrameworks']
  use_react_native!(...)

  post_install do |installer|
    react_native_post_install(installer, config[:reactNativePath], ...)

    # rnfb-static-frameworks-fix
    installer.pods_project.targets.each do |target|
      if target.name.start_with?("RNFB") || target.name.start_with?("Firebase") || target.name.start_with?("Google")
        target.build_configurations.each do |config|
          config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        end
      end

      if target.name == "React-Core" || target.name == "ReactCommon" || target.name == "RCTRequired"
        target.build_configurations.each do |config|
          config.build_settings['DEFINES_MODULE'] = 'YES'
          config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        end
      end
    end
  end
end
```

This block is confirmed present in the Podfile EAS receives. **Build still fails identically to attempts #7 and #8.**

## The error (still identical)

```
declaration of 'RCTBridgeModule' must be imported from module 'RNFBApp.RNFBAppModule' before it is required
type specifier missing, defaults to 'int' [-Wimplicit-int]
expected ')'
(repeats ~15 times then bails)
too many errors emitted, stopping now [-ferror-limit=]
```

## What I think might be happening

I have a few theories. I can't tell which is correct without more clang/cocoapods debugging skill than I have:

- **(α)** `DEFINES_MODULE = YES` in `post_install` is too late — by the time post_install runs, CocoaPods has already generated the .modulemap files (or skipped generating them for React-Core). The setting we flip never gets read.
- **(β)** `DEFINES_MODULE` *is* generating a modulemap, but the modulemap doesn't expose `RCTBridgeModule.h` at the top level (umbrella header issue?). RNFB tries to `@import React.RCTBridgeModule` and that symbol path doesn't exist.
- **(γ)** The error message is misleading. It mentions `RNFBApp.RNFBAppModule` as the "must import from" module, but it's actually telling us the *consumer* (RNFB) is itself a framework module that needs RCTBridgeModule, and React-Core is still being seen as headers-only. The fix would be elsewhere — maybe in RNFB's own podspec, which I can't easily patch from an Expo plugin.
- **(δ)** I need to apply `DEFINES_MODULE` to **every** `React-*` and `Yoga` and `glog` and `RCT-*` pod, not just three. Setting it on three isn't enough because RCTBridgeModule's umbrella header transitively references those.

## Specific questions for you

1. **Is theory α correct** — does setting `DEFINES_MODULE` in `post_install` actually take effect, or has CocoaPods already locked the modulemap generation by then? If too late, where's the right hook (a pre_install? podspec override via `Podfile.properties.json`?)?

2. **If `DEFINES_MODULE` really does work in post_install but I need more pods**, what's the complete list of React-* pods that contain or transitively expose `RCTBridgeModule.h` and friends? React-Core, ReactCommon, RCTRequired weren't enough. Should I add: React-RCTAppDelegate, React-jsi, React-Codegen, React-RCTBridge, FBReactNativeSpec, glog, Yoga, RCT-Folly? (Some of these exist; some are renamed under New Arch.)

3. **Is there a way to inspect / dump the actual modulemap** that Xcode generated for React-Core during the EAS build, so I can verify whether `DEFINES_MODULE` did anything? I have build logs but no easy way to extract intermediate artifacts.

4. **Would `pre_install`** (instead of post_install) be the right place to flip `DEFINES_MODULE`? Or — could I inject something into `Podfile.properties.json` (which Expo writes early) that achieves the same?

5. **Is the cleaner Podfile-level approach** to declare `pod 'React-Core', :modular_headers => true` explicitly via `extraPods` in `expo-build-properties`? I haven't tried that because I assumed `use_modular_headers!` at the target level covered it.

6. **At what point do I conclude this is genuinely unfixable in this stack** and pivot to GA4 Measurement Protocol HTTP from RN? Given we've now had 9 EAS attempts, the second-round fix (CLANG_ALLOW) made progress, but the third-round fix (DEFINES_MODULE) didn't move the error message at all. Is there one more reasonable angle to try, or is this the point where pivoting is the right call?

## What I can do quickly

If you suggest something concrete and small, I can:
- Update the plugin and run one more EAS build (5 min compute + 5 min wait)
- Dump the generated Podfile / Podfile.properties.json before submission
- Cherry-pick specific pods to apply settings to

If you tell me "this won't work, switch to Measurement Protocol," I can pivot in about an hour:
- Revert the @react-native-firebase install + Podfile plugin + GoogleService files
- Rewrite `apps/mobile/lib/analytics.ts` to POST events to `https://www.google-analytics.com/mp/collect`
- All call sites already use the wrapper, so no other code changes
- Web Firebase Analytics keeps working untouched

## Constraints (unchanged from prior consults)

- **Cannot disable New Architecture** (would regress iOS 26 Liquid Glass header opt-out)
- **Cannot eject from Expo** (managed workflow + config plugins only)
- **Cannot patch RNFB source directly** (it's an npm dep we don't fork)

## Versions (unchanged)

- Expo SDK 54 (RN 0.81)
- `@react-native-firebase/app` + `/analytics`: `^21.14.0`
- `expo-build-properties`: latest with `ios.useFrameworks: "static"`
- React-Native-Screens: `~4.17.1` (pinned for iOS 26 New Arch opt-out)
- EAS Build preview profile

## Honest ask

I trust your judgement — the CLANG_ALLOW recommendation was the only meaningful progress this whole journey. **If your read is "this isn't worth more cycles, pivot," I will pivot.** I'd rather take a clear "no" than spend another 5 EAS attempts.
