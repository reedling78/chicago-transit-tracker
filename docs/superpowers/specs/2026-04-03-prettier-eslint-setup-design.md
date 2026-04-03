# ESLint + Prettier Setup — Design Spec

## Problem

The codebase has ESLint for code quality linting but no automated code formatter. Code style (indentation, quotes, semicolons, trailing commas) is consistent by convention only — not enforced. There's no IDE integration for auto-formatting on save, and no recommended extensions for contributors.

## Goal

Add Prettier as the project's code formatter, integrate it with the existing ESLint setup to prevent rule conflicts, and configure VS Code for auto-format-on-save so the developer experience is seamless.

## Design Decisions

### Prettier as sole formatter, ESLint for code quality only

The industry standard is to separate concerns: Prettier handles formatting (whitespace, line breaks, quotes), ESLint handles code quality (unused variables, import errors). `eslint-config-prettier` disables all ESLint rules that would conflict with Prettier.

**Why not `eslint-plugin-prettier`?** The plugin approach (running Prettier as an ESLint rule) is deprecated. It's slower, produces confusing error messages, and conflates two separate concerns.

### Config matches existing code style

The `.prettierrc` settings (`semi: false`, `singleQuote: true`, `trailingComma: "all"`, `tabWidth: 2`) were chosen to match the codebase's existing conventions. This minimizes the initial formatting diff.

`printWidth: 100` was chosen over the default 80 to accommodate Tailwind CSS class strings without excessive line wrapping.

### prettier-plugin-tailwindcss for class sorting

This is the official Tailwind Labs plugin and the industry standard. It sorts utility classes into a canonical order, making them consistent and scannable across the project.

### VS Code integration

- `editor.defaultFormatter: esbenp.prettier-vscode` — Prettier handles all formatting
- `editor.formatOnSave: true` — auto-format on every save
- `editor.codeActionsOnSave: source.fixAll.eslint` — ESLint auto-fix (unused imports, etc.) also runs on save
- `.vscode/extensions.json` recommends Prettier, ESLint, and Tailwind CSS IntelliSense

### npm scripts

- `lint` updated to run both ESLint and Prettier check (CI-friendly)
- `format` / `format:check` for Prettier standalone
- `lint:fix` for one-command fix-everything

## What's NOT in Scope

- Husky/lint-staged pre-commit hooks (can be added later)
- CI enforcement (the existing `npm run lint` in CI will now include Prettier check)
- Fixing pre-existing ESLint warnings (unused vars in scripts, require() imports)

## Dependencies Added

- `prettier` — the formatter
- `eslint-config-prettier` — disables conflicting ESLint rules (v10+ supports flat config)
- `prettier-plugin-tailwindcss` — sorts Tailwind classes
