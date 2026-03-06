# CLAUDE.md

## Project Overview

Cratesmove is a desktop application (Electron + Vue 3) for managing Counter-Strike 2 storage units. It's a monorepo using npm workspaces.

## Tech Stack

- **Desktop:** Electron 40
- **Frontend:** Vue 3 (Composition API + `<script setup>`), TypeScript, Nuxt UI v3
- **Build:** Vite, electron-builder
- **Node:** >= 23.0.0

## Project Structure

```
packages/
  main/       → Electron main process (Steam integration, IPC, auto-updater)
  preload/    → IPC bridge between main and renderer
  renderer/   → Vue 3 frontend (pages: Login, Inventory, Storage)
  electron-versions/ → Helper for electron version detection
```

## Commands

| Command | Purpose |
|---------|---------|
| `npm start` | Start dev mode |
| `npm run build` | Build all workspace packages |
| `npm run compile` | Full build + electron-builder distributable |
| `npm run typecheck` | TypeScript check across all workspaces |
| `npm run lint` | ESLint check |
| `npm run lint:fix` | Auto-fix linting issues |
| `npm run format` | Prettier format |
| `npm run format:check` | Check formatting |

## Release Process

1. Make sure remote is up to date (`git pull`)
2. Bump version in `package.json`
3. Run `npm install --package-lock-only` to update `package-lock.json`
4. Create a single commit named after the version (e.g. `v0.3.0`)
5. Push to remote
6. Create a tag with `git tag v0.X.0` and push it with `git push --tags`
7. The `release.yml` GitHub Action triggers on `v*` tags, builds for Windows/macOS/Linux, and creates a **draft** release with artifacts attached
8. Wait for the GitHub Action workflow to finish (check with `gh run list --limit 1`)
9. Write a friendly changelog for the draft release using `gh release edit`. Look at previous releases (`gh release view v0.X.0`) to match the style — a `## What's Changed` section with a bullet list describing each change in plain language (no technical jargon), plus a `**Full Changelog**` comparison link at the bottom
10. Publish the release on GitHub

## Steam Libraries

The main process (`packages/main/src/modules/SteamConnection.ts`) uses three core libraries. Full API docs are in `references/`:

| Library | Docs | Purpose |
|---------|------|---------|
| `steam-user` v5 | [`references/steam-user.md`](references/steam-user.md) | Steam client protocol (CM connection, auth via refresh token, personas) |
| `globaloffensive` v3 | [`references/globaloffensive.md`](references/globaloffensive.md) | CS2 Game Coordinator (inventory, storage unit/casket operations) |
| `steam-session` v1 | [`references/steam-session.md`](references/steam-session.md) | Credential login + Steam Guard 2FA (produces refresh tokens) |

## Code Style

- Vue: Composition API with `<script setup>` and TypeScript
- Linting: ESLint 9 (flat config) + typescript-eslint + eslint-plugin-vue
- Formatting: Prettier
- Run `npm run lint:fix && npm run format` before committing
- **Commits:** Always use [Conventional Commits](https://www.conventionalcommits.org/) (e.g. `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`). Keep commit messages short and simple — one line, no bullet lists or multi-line bodies.
