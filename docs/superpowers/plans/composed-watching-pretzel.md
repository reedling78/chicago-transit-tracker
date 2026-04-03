# ESLint + Prettier Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Prettier as the project formatter, integrate it with the existing ESLint setup, and configure VS Code for auto-format-on-save.

**Architecture:** Prettier handles all formatting; ESLint handles code quality only. `eslint-config-prettier` disables ESLint rules that conflict with Prettier. VS Code is configured to run both on save.

**Tech Stack:** Prettier, eslint-config-prettier, prettier-plugin-tailwindcss, VS Code extensions

---

### Task 1: Install Dependencies

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Install Prettier + integration packages**

```bash
npm install --save-dev prettier eslint-config-prettier prettier-plugin-tailwindcss
```

- `prettier` — the formatter
- `eslint-config-prettier` — disables ESLint rules that conflict with Prettier (v10+ supports flat config)
- `prettier-plugin-tailwindcss` — sorts Tailwind classes into canonical order

- [ ] **Step 2: Verify installation**

Run: `npx prettier --version`
Expected: Version number printed (e.g., `3.x.x`)

---

### Task 2: Create Prettier Configuration

**Files:**

- Create: `.prettierrc`
- Create: `.prettierignore`

- [ ] **Step 1: Create `.prettierrc`**

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "tabWidth": 2,
  "printWidth": 100,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

Settings match the existing code style:

- `semi: false` — codebase uses no semicolons
- `singleQuote: true` — all imports/strings use single quotes
- `trailingComma: "all"` — trailing commas in multiline objects/arrays
- `tabWidth: 2` — 2-space indentation throughout
- `printWidth: 100` — accommodates Tailwind class strings without excessive wrapping
- `plugins` — sorts Tailwind classes automatically

- [ ] **Step 2: Create `.prettierignore`**

```
.next
out
build
node_modules
package-lock.json
public
```

---

### Task 3: Update ESLint Config

**Files:**

- Modify: `eslint.config.mjs`

- [ ] **Step 1: Add eslint-config-prettier to flat config**

Replace the full contents of `eslint.config.mjs` with:

```javascript
import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import prettierConfig from 'eslint-config-prettier'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettierConfig,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
])

export default eslintConfig
```

Key change: `prettierConfig` is placed **after** the Next.js configs so it overrides their formatting rules.

- [ ] **Step 2: Verify ESLint still runs**

Run: `npx eslint`
Expected: No errors (or same errors as before — no new conflicts)

---

### Task 4: Add npm Scripts

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Update scripts in `package.json`**

Change the existing `lint` script and add new scripts:

```json
"lint": "eslint && prettier --check .",
"lint:fix": "eslint --fix && prettier --write .",
"format": "prettier --write .",
"format:check": "prettier --check ."
```

All other existing scripts remain unchanged.

- [ ] **Step 2: Verify format:check works**

Run: `npm run format:check`
Expected: Lists unformatted files (expected at this point since we haven't formatted yet)

---

### Task 5: Configure VS Code

**Files:**

- Modify: `.vscode/settings.json`
- Create: `.vscode/extensions.json`

- [ ] **Step 1: Update `.vscode/settings.json`**

Replace contents with:

```json
{
  "cSpell.words": ["headsign", "metra"],
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "eslint.useFlatConfig": true
}
```

- `editor.defaultFormatter` — Prettier handles formatting
- `editor.formatOnSave` — auto-format on save
- `editor.codeActionsOnSave` — ESLint auto-fix on save (code quality only, not formatting)
- `eslint.useFlatConfig` — tells VS Code ESLint extension to use flat config

- [ ] **Step 2: Create `.vscode/extensions.json`**

```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss"
  ]
}
```

- [ ] **Step 3: Verify VS Code prompts for extensions**

Open the project in VS Code. It should prompt to install recommended extensions if not already installed.

---

### Task 6: Format the Codebase

**Files:**

- All `.ts`, `.tsx`, `.mjs`, `.js` files

- [ ] **Step 1: Run Prettier on the entire codebase**

```bash
npx prettier --write .
```

Expected changes:

- Tailwind class reordering in JSX files
- `eslint.config.mjs` and `postcss.config.mjs` reformatted (double quotes → single, semicolons removed)
- Minor line-wrapping adjustments

- [ ] **Step 2: Review the diff**

```bash
git diff --stat
```

Scan the diff for unexpected changes. The formatting should be cosmetic only — no logic changes.

---

### Task 7: Verify Everything Works

- [ ] **Step 1: Run lint (ESLint + Prettier check)**

Run: `npm run lint`
Expected: Clean pass, no errors

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: All tests pass (formatting changes don't affect behavior)

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Static export succeeds

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add Prettier with ESLint integration and VS Code config"
```
