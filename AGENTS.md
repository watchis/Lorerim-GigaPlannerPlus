# AGENTS.md

## Cursor Cloud specific instructions

Lorerim GigaPlanner Plus is a **client-only** React 19 + TypeScript SPA built with Vite. There is no backend, database, or external service — builds are stored in browser localStorage. Node 22 and dependencies are already installed by the startup update script (`npm ci`).

### Services

Only one service is needed to run/test the product end to end:

- **Planner web app**: `npm run dev` → Vite dev server on port `5173`. The dev server redirects `/` to the base path, so open `http://localhost:5173/Lorerim-GigaPlannerPlus/` (not the bare root).

Optional dev-only tools (not needed for normal development/testing):

- **Data editor**: `npm run dev:editor` → separate Vite app on port `5174`.
- **LoreRim data importer**: `npm run import:lorerim -- --install "<path>"` — requires a full local LoreRim/Skyrim install (~3,500 plugins); not runnable in this environment.

### Lint / test / build (see `.github/CI.md` and `package.json` scripts)

- Lint: `npm run lint`. Note: the repo currently has **pre-existing** ESLint errors (mostly `react-hooks` rules in `tools/data-editor/` and some in `src/`). These are not caused by environment setup; `npm run lint` is expected to exit non-zero on the current codebase.
- Test: `npm test` runs both suites — `npm run test:app` (Vitest, `src/**`) and `npm run test:import` (Node built-in test runner, `tools/import/lib/**`). Both pass.
- Build: `npm run build` (`tsc -b && vite build`). Also acts as schema validation for the `data/` game JSON; emits a harmless >500 kB chunk-size warning.

### Data model note

This planner models three distinct systems (skill levels, perk points, skill points) — see `.cursor/rules/giga-planner-data-model.mdc`. Game data lives as JSON under `data/`; do not hardcode economy values or level requirements in TypeScript.
