# GigaPlanner Data Editor

Local-only tool for visually editing JSON files in the repo's [`data/`](../../data/) folder.

This package lives outside `src/` and is **not** built or deployed with the main planner app.

**Related docs:** [`data/README.md`](../../data/README.md) · [`tools/import/README.md`](../import/README.md) · [`src/README.md`](../../src/README.md) · [root `README.md`](../../README.md)

---

## Run

From the repository root:

```bash
npm run dev:editor
```

Then open **http://localhost:5174/**.

---

## What it does

| Feature | Details |
|---------|---------|
| **Browse** | All files under `data/game/` and `data/ui/` |
| **Tree editor** | Edit values in a planner-styled tree view or raw JSON |
| **Perk grid** | Drag perk nodes on a grid for perk tree files |
| **Prerequisites** | Link and unlink `prerequisites` / `prerequisitesAny` in layout view |
| **Save to disk** | Writes directly via a Vite dev-server API |

After saving game data, validate from the repo root:

```bash
npm run build
npm test
```

---

## Structure

```
tools/data-editor/
  index.html          # Entry point
  vite.config.ts      # Separate Vite config (port 5174)
  vite-plugin.ts      # Dev-only file read/write API
  src/                # Editor React app (no imports from src/)
```

---

## When to use

| Task | Tool |
|------|------|
| Move perk nodes, resize grids, wire prerequisites | **Data editor** (this tool) |
| Rebuild perk trees and other game data from LoreRim plugins | [`import:lorerim`](../import/README.md) |
| Edit economy, labels, or race starting values | Text editor / IDE → [`data/README.md`](../../data/README.md) |
