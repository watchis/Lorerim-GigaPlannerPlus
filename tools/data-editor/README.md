# GigaPlanner Data Editor

Local-only tool for visually editing JSON files in the repo's `data/` folder.

This package lives outside `src/` and is **not** built or deployed with the main planner app.

## Run

From the repository root:

```bash
npm run dev:editor
```

Then open `http://localhost:5174/`.

## What it does

- Browse `data/game/` and `data/ui/` JSON files
- Edit values in a planner-styled tree view (or raw JSON)
- Drag perk nodes on a grid layout for perk tree files
- Link and unlink prerequisite relationships in layout view (`prerequisites` / `prerequisitesAny`)
- Save changes directly to disk via a Vite dev-server API

## Structure

```
tools/data-editor/
  index.html          # Entry point
  vite.config.ts      # Separate Vite config
  vite-plugin.ts      # Dev-only file read/write API
  src/                # Editor React app (no imports from src/)
```
