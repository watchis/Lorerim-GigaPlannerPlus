# Lorerim GigaPlanner Plus

A data-driven character build planner for the [LoreRim](https://www.lorerim.com/) Skyrim modpack.

## Features

- **JSON-driven game data** — races, standing stones, deities, traits, skills, and perk trees live in `data/game/`
- **JSON-driven UI** — theme, layout, and labels in `data/ui/` control look and feel without code changes
- **Interactive perk trees** — click perks with prerequisite and skill requirement validation
- **Live derived stats** — Health/Magicka/Stamina drive computed combat attributes
- **Shareable build codes** — encode/decode builds for URL sharing and clipboard copy
- **Auto-save** — build state persists in localStorage
- **Multiple saved builds** — create, rename, delete, and switch between character builds (stored locally in your browser)

## Development

```bash
npm install
npm run dev
```

### Testing

```bash
npm test              # app (Vitest) + import tooling (Node test runner)
npm run test:app      # src/ unit tests only
npm run test:import   # tools/import/lib/ tests only
npm run test:watch    # Vitest watch mode
npm run lint
```

Pull requests run **`npm test`** via [`.github/workflows/test.yml`](.github/workflows/test.yml). See [`.github/README.md`](.github/README.md) for CI details.

Coverage highlights:

- **App** — build engine economy, perk selection, build codec round-trip, perk grid stacks, data loader validation against bundled JSON
- **Import** — trait parsing, perk layout, MO2 install helpers, bonus effect rules (see `tools/import/README.md`)

### Local data editor (not deployed)

A self-contained dev tool in `tools/data-editor/` for editing JSON under `data/`:

```bash
npm run dev:editor
```

Opens at `http://localhost:5174/`. This is separate from the main app and is **not** included in the GitHub Pages build.

## Build

```bash
npm run build
npm run preview
```

## Deployment

Pushes to `main` deploy to GitHub Pages via `.github/workflows/deploy.yml`.

Live site: `https://watchis.github.io/Lorerim-GigaPlannerPlus/`


## Updating game data

See **[tools/import/README.md](tools/import/README.md)** for importing perks, races, and traits from a local LoreRim install (`npm run import:lorerim -- --install <path>`).

## Project layout

```
data/
  game/           # LoreRim mechanics and content
  ui/             # Theme, layout, and label strings
tools/
  data-editor/    # Local JSON editor (dev only, not deployed)
  import/         # LoreRim data import (dev only, not deployed)
src/
  data/           # Zod schemas and loader
  engine/         # Stat computation and build codec
  panels/         # Layout-driven UI panels
```

See also [`src/README.md`](src/README.md) for application architecture and testing conventions.

To add a new perk tree manually, create `data/game/perks/<skill>.json` and register it in `data/game/perks/index.json`.

To change the UI theme, edit `data/ui/theme.json`. To rearrange panels, edit `data/ui/layout.json`.

## Data model notes

Skill levels, perk points, and skill points are three separate systems. See `.cursor/rules/giga-planner-data-model.mdc` for conventions when editing economy or perk data.
