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
7. The `release.yml` GitHub Action triggers on `v*` tags, builds for Windows/macOS/Linux, and creates a **draft** release with auto-generated notes and artifacts attached
8. Edit the draft release on GitHub to write a user-friendly changelog and publish it

## Code Style

- Vue: Composition API with `<script setup>` and TypeScript
- Linting: ESLint 9 (flat config) + typescript-eslint + eslint-plugin-vue
- Formatting: Prettier
- Run `npm run lint:fix && npm run format` before committing
- **Commits:** Always use [Conventional Commits](https://www.conventionalcommits.org/) (e.g. `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`)
