# Monorepo Research: Next.js web + Expo mobile + Firebase Functions

Research for planning the addition of an Expo app alongside the existing Next.js 16 web app and `functions/` package. Compiled from Expo, Next.js, Firebase, and community docs (2024–2026).

---

## 1. Monorepo tooling: pnpm + Turborepo

**Recommendation: pnpm workspaces + Turborepo.**

- Expo's official monorepo guide lists Bun, npm, pnpm, and Yarn as first-class, and as of **SDK 54 pnpm is Expo's default install strategy** with first-class isolated-install support. Expo's Metro config auto-handles monorepos with `expo/metro-config` — no manual `watchFolders` since SDK 52.
- Turborepo is the de-facto task orchestrator for Next.js + Expo combos (Vercel owns both Turborepo and Next.js; their own Next.js guide uses it). It gives you remote-cacheable `build`, `lint`, `test`, `typecheck` pipelines across apps.
- **Avoid Nx** unless you already know it — heavier, more opinionated, and the extra value (generators, graph) is marginal for 2 apps + 1 functions package.
- **Avoid Bun workspaces** for this repo: Firebase App Hosting and Cloud Functions both standardize on npm/pnpm lockfiles, and Bun's RN story is still maturing.

**Gotchas (from Expo docs):**
- Never allow duplicate `react`, `react-native`, or `expo` versions — run `pnpm why react-native` and pin via root `resolutions`/`pnpm.overrides`.
- If pnpm's isolated linker breaks a native module, set `node-linker=hoisted` in `.npmrc` (not `pnpm-workspace.yaml` — the doc wording is slightly misleading).
- Don't hardcode paths to native files; use `require.resolve()`.

## 2. Directory layout

**Recommendation:**

```
apps/
  web/         # current Next.js app moves here
  mobile/      # new Expo app
  functions/   # current functions/ moves here
packages/
  shared/      # types, pure logic, Firestore data access
  config/      # shared eslint, tsconfig, prettier (optional)
turbo.json
pnpm-workspace.yaml
package.json
```

`apps/web` + `apps/mobile` + `packages/shared` is still the canonical layout (Expo docs, Turborepo docs, byCedric/expo-monorepo-example, axeldelafosse/expo-next-monorepo-example).

**Firebase Functions placement:** Both `apps/functions` and root `functions/` work. Put it under `apps/functions` for consistency, but keep `firebase.json` at the repo root and set `"source": "apps/functions"` there. Use the `codebase` field (Firebase CLI ≥10.7.1) so you can split functions later without restructuring. **Important App Hosting note:** Firebase App Hosting supports monorepos natively — in `apphosting.yaml` set `rootDirectory: /apps/web`. This is documented at firebase.google.com/docs/app-hosting/monorepos and is the key thing that makes the move painless.

## 3. Sharing code between Next.js and Expo

**Safe to share in `packages/shared`:**
- TypeScript types/interfaces (`Line`, `Station`, alert shapes)
- Pure logic: `cta-pulse.ts`, `metra-trip-matching.ts`, `metra-status.ts`, slug helpers, status derivation, color constants
- Zod/Valibot schemas if added later

**Must NOT be shared:**
- Anything importing `firebase-admin` (server-only, Node-only) → keep in `apps/web/app/lib/firebase-admin.ts` and `apps/functions`
- Anything importing `next/*`, `next/image`, `next/link` → web-only
- DOM/`window` code, including the current `ThemeToggle` logic
- Client Firestore reads should live in `packages/shared` **only** if written against the modular `firebase/firestore` API (works for both platforms).

**Build strategy: consume source directly, don't prebuild.** The modern Next.js path is `transpilePackages: ['@ctt/shared']` in `next.config.ts`. Metro (Expo) picks up workspace source automatically via `expo/metro-config`. Skip `tsup` — it complicates `"use client"` directives and adds a build step. The official Next.js 13+ Turborepo example uses source packages, not prebuilt. Give `packages/shared` its own `tsconfig.json` (extending a shared base) and export via `"exports"` map with a single `./src/index.ts` entry.

TypeScript project references are optional; with Turborepo + `transpilePackages` you usually don't need them, but they speed up `tsc --build` for typechecking pipelines.

## 4. Expo + Firebase

**Recommendation for a read-mostly Firestore app: Firebase JS SDK v12+ (modular).**

- Expo's own guide (`docs.expo.dev/guides/using-firebase/`) still lists Firebase JS SDK as the default path, and as of SDK 54 it requires `firebase@12+`.
- Firestore, Auth, Storage, and RTDB all work fine via the modular JS SDK in Expo Go and EAS Build. Your shared `packages/shared` code can use the same `firebase/firestore` imports that web uses — this is the single biggest code-reuse win.
- **React Native Firebase** is only necessary if you need Analytics, Crashlytics, Dynamic Links, or FCM push. Its tradeoffs: faster cold start + better offline, but requires a dev client (no Expo Go), native config, and duplicates the API surface so you lose web/mobile code sharing in `packages/shared`.
- For CTT specifically (read-only Firestore, no crash reporting yet), start with Firebase JS SDK; migrate selectively to RNFirebase only if you add FCM push notifications for service alerts.
- **EAS Build:** works with pnpm monorepos out of the box; set `"cli": { "appVersionSource": "remote" }` and run `eas build` from `apps/mobile`. EAS tarballs the whole monorepo so workspace packages resolve correctly.

## 5. CI/CD

- **GitHub Actions:** one workflow, parallel jobs. Use Turborepo's `--filter` to scope: `turbo run lint test build --filter=web...` and `--filter=mobile...`. Cache `~/.pnpm-store` and `.turbo/` — this is the standard pattern in byCedric/expo-monorepo-example.
- **Web deploy:** unchanged — Firebase App Hosting reads `apphosting.yaml` with `rootDirectory: /apps/web`.
- **Functions deploy:** `firebase deploy --only functions` from repo root; `firebase.json` points at `apps/functions`.
- **Mobile releases:** EAS Build triggered from a separate workflow on tag push, or via EAS Workflows (Expo's own CI) if you want tighter integration. Use `expo/expo-github-action` with `EXPO_TOKEN` secret.
- Keep the existing `lint` + `test` jobs; just add a matrix entry for `mobile` that runs `expo-doctor` and jest-expo.

## 6. Combo-specific gotchas

1. **`transpilePackages` in `next.config.ts`** must include `@ctt/shared` **and** `react-native`, `react-native-web`, `expo`, and any `expo-*` modules if you also run Next.js against RN code. Since you are *not* sharing RN UI with web, you likely only need `['@ctt/shared']`.
2. **Metro + workspace packages:** `expo/metro-config` handles `watchFolders` automatically, but only if the package is a real workspace (listed in `pnpm-workspace.yaml`). Symlinked one-offs will silently fail to hot-reload.
3. **Hoisting + Firebase SDK:** Firebase JS SDK has historically had issues when `@firebase/*` subpackages are deduped inconsistently. With pnpm, pin `firebase` at the root and use `pnpm.overrides` to force a single version.
4. **Firebase Admin SDK must NEVER end up in `packages/shared`** — it will break Metro bundling the moment mobile imports anything from shared. Enforce with an ESLint `no-restricted-imports` rule in `packages/shared/.eslintrc`.
5. **Functions + workspace packages:** Firebase CLI uploads only the `functions` directory, so any `packages/shared` import must either (a) be bundled via esbuild/tsup into `functions/lib` at predeploy time, or (b) published as a real package. Easiest pattern: add a `predeploy` hook in `firebase.json` that runs `turbo run build --filter=functions...` and bundles shared code into the functions output. See `firecms.co/blog/firebase_functions_monorepo/` for a working recipe.
6. **TypeScript path aliases** (`@components/*`, `@lib/*`) currently live in the root `tsconfig.json`. After the move, each app owns its own `tsconfig.json` extending `packages/config/tsconfig.base.json`, and `@lib/*` becomes web-local. Shared code is imported as `@ctt/shared`, not via path alias.

---

## Concrete recommendation summary

| Concern | Pick |
|---|---|
| Package manager | **pnpm** |
| Task runner | **Turborepo** |
| Layout | `apps/{web,mobile,functions}` + `packages/shared` |
| Shared code strategy | Source (no prebuild), `transpilePackages: ['@ctt/shared']` |
| Expo Firebase SDK | **Firebase JS SDK v12+** (modular) |
| Web deploy | Firebase App Hosting, `rootDirectory: /apps/web` |
| Functions deploy | `firebase.json` with `source: apps/functions`, predeploy bundle |
| Mobile CI | EAS Build via `expo/expo-github-action` |

## Sources

- [Expo — Work with monorepos](https://docs.expo.dev/guides/monorepos/)
- [Expo — Set up EAS Build with a monorepo](https://docs.expo.dev/build-reference/build-with-monorepos/)
- [Expo — Using Firebase](https://docs.expo.dev/guides/using-firebase/)
- [Firebase blog — Which React Native Firebase SDK to use](https://firebase.blog/posts/2023/03/which-react-native-firebase-sdk-to-use/)
- [Firebase — Use monorepos with App Hosting](https://firebase.google.com/docs/app-hosting/monorepos)
- [Firebase — Organize multiple functions (codebase field)](https://firebase.google.com/docs/functions/organize-functions)
- [Next.js — transpilePackages config](https://nextjs.org/docs/app/api-reference/config/next-config-js/transpilePackages)
- [Turborepo — Next.js guide](https://turborepo.dev/docs/guides/frameworks/nextjs)
- [Turborepo — Structuring a repository](https://turborepo.dev/docs/crafting-your-repository/structuring-a-repository)
- [byCedric/expo-monorepo-example (pnpm + Turborepo reference)](https://github.com/byCedric/expo-monorepo-example)
- [axeldelafosse/expo-next-monorepo-example](https://github.com/axeldelafosse/expo-next-monorepo-example)
- [FireCMS — Firebase Functions Monorepo Deployments That Work](https://firecms.co/blog/firebase_functions_monorepo/)
- [CodeJam — Firebase functions in a monorepo](https://www.codejam.info/2023/04/firebase-functions-monorepo.html)
- [Expo GitHub Action](https://github.com/expo/expo-github-action)
