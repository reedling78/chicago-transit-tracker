# ESLint + Prettier Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Prettier as the project formatter, integrate it with the existing ESLint setup, and configure VS Code for auto-format-on-save.

**Architecture:** Prettier handles all formatting; ESLint handles code quality only. `eslint-config-prettier` disables ESLint rules that conflict with Prettier. VS Code is configured to run both on save.

**Tech Stack:** Prettier, eslint-config-prettier, prettier-plugin-tailwindcss, VS Code extensions

---

### Task 1: Install Dependencies

**Files:**

- Modify: `package.json`

- [x] **Step 1: Install Prettier + integration packages**

```bash
npm install --save-dev prettier eslint-config-prettier prettier-plugin-tailwindcss
```

- [x] **Step 2: Verify installation**

Run: `npx prettier --version`

---

### Task 2: Create Prettier Configuration

**Files:**

- Create: `.prettierrc`
- Create: `.prettierignore`

- [x] **Step 1: Create `.prettierrc`**

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

- [x] **Step 2: Create `.prettierignore`**

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

- [x] **Step 1: Add eslint-config-prettier to flat config**

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

- [x] **Step 2: Verify ESLint still runs**

Run: `npx eslint`

---

### Task 4: Add npm Scripts

**Files:**

- Modify: `package.json`

- [x] **Step 1: Update scripts in `package.json`**

```json
"lint": "eslint && prettier --check .",
"lint:fix": "eslint --fix && prettier --write .",
"format": "prettier --write .",
"format:check": "prettier --check ."
```

---

### Task 5: Configure VS Code

**Files:**

- Modify: `.vscode/settings.json`
- Create: `.vscode/extensions.json`

- [x] **Step 1: Update `.vscode/settings.json`**

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

- [x] **Step 2: Create `.vscode/extensions.json`**

```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss"
  ]
}
```

---

### Task 6: Format the Codebase

- [x] **Step 1: Run Prettier on the entire codebase**

```bash
npx prettier --write .
```

- [x] **Step 2: Update snapshots**

```bash
npm test -- -u
```

---

### Task 7: Verify Everything Works

- [x] **Step 1: `npm run format:check`** — All files formatted
- [x] **Step 2: `npx eslint`** — No new errors (pre-existing warnings only)
- [x] **Step 3: `npm test`** — 137 tests passing
- [x] **Step 4: `npm run build`** — Static export succeeds
