# GigaPlanner data

All game content and most UI copy for the planner lives here as JSON. The app loads these files at build time, validates them with Zod schemas in [`src/data/schemas/index.ts`](../src/data/schemas/index.ts), and never hardcodes LoreRim numbers in TypeScript.

**Related docs:** [root `README.md`](../README.md) · [`src/README.md`](../src/README.md) · [`tools/import/README.md`](../tools/import/README.md) · [`tools/data-editor/README.md`](../tools/data-editor/README.md)

---

## Contents

| Section | Jump to |
|---------|---------|
| Folder layout | [below](#folder-layout) |
| Three progression systems | [below](#three-separate-progression-systems) |
| How data is loaded | [below](#how-data-is-loaded) |
| Ways to edit | [below](#ways-to-edit) |
| Game files reference | [below](#game-files-reference) |
| UI files reference | [below](#ui-files-reference) |
| Consistency checklist | [below](#cross-file-consistency-checklist) |
| Common mistakes | [below](#common-mistakes) |

---

## Folder layout

```
data/
  game/                         # LoreRim mechanics and character content
    manifest.json               # App identity, skill list, selection limits
    mechanics.json              # Leveling economy, derived-stat formulas
    stats.json                  # Stat catalog for the derived-stats panel
    skills.json                 # Skill metadata (name, category, major/minor eligibility)
    races.json                  # Playable races (display + starting values)
    race-effects.json           # Structured race bonuses (merged into races at load)
    traits.json                 # Biggie Traits picker entries
    birthsigns.json             # Birthsign / standing stone choices
    deities.json                 # Wintersun deity choices
    character-options.json      # Optional setup toggles (Oghma, Alduin trait, etc.)
    extension-bindings.json     # Importer registry: perk/option → extensions/ plugin id
    perk-player-level-reqs.json # Perk id → minimum player level (sidecar file)
    perks/
      index.json                # skill id → tree filename
      *.json                    # One perk tree per skill (except traits)
  ui/
    theme.json                  # Colors, fonts, radii, shadows
    layout.json                 # Planner column layout and panel order
    labels.json                 # All user-visible strings
```

---

## Three separate progression systems

Do not conflate these. The planner models each independently.

| System | What it is | Where it lives | Spent on |
|--------|------------|----------------|----------|
| **Skill level** | Per-skill tree level (e.g. Block 60) | Runtime: `build.skillLevels` | Nothing directly — gates perk `skillReq` |
| **Perk points** | Currency for selecting tree nodes | `mechanics.leveling.initialPerkPoints`, `perkPointsPerLevel` | Perks with `costsPerkPoint: true` (default) |
| **Skill points** | Currency for raising skill levels | `mechanics.leveling.skillPointsPerLevel`, `skillLevelCosts` | +1 skill level per tiered cost |

Key formulas (implemented in `src/engine/buildEngine.ts`, driven by `mechanics.json`):

- **Skill cap** = `min(maxSkillLevel, playerLevel + maxSkillAbovePlayerLevel)`
- **Perk point budget** = `initialPerkPoints + (playerLevel - baseLevel) × perkPointsPerLevel`
- **A perk costs 1 point** unless `costsPerkPoint: false` on that node

---

## How data is loaded

`src/data/loader.ts` imports every JSON file, validates it, and assembles `AppData`:

1. **Perk trees** — `perks/index.json` maps each skill id to a filename. Every listed file must exist under `perks/`. Files other than `index.json` in that folder are loaded automatically via Vite glob.
2. **Player level requirements** — `perk-player-level-reqs.json` is merged onto matching perks as `playerLevelReq` at load time. Perk nodes should **not** embed player level reqs inline; use the sidecar file.
3. **Race effects** — `race-effects.json` entries are appended to each race's `effects` array when the race id matches.

If validation fails, the app shows an error screen with the Zod message. Run `npm run build` after edits to catch schema errors early.

---

## Ways to edit

### 1. Text editor or IDE

Edit JSON directly. Use valid JSON (double quotes, no trailing commas). Keep ids stable — build codes and perk links depend on them.

### 2. Local data editor (recommended for perk layout)

```bash
npm run dev:editor
```

Opens `http://localhost:5174/`. Browse `data/game/` and `data/ui/`, edit in a tree view or raw JSON, and drag perk nodes on a grid for perk tree files. Saves directly to disk. See `tools/data-editor/README.md`.

### 3. Import from a LoreRim install

Rebuilds perk trees, traits, races, birthsigns, and deities from Skyrim plugin records in your LoreRim MO2 install. Hand-tuned planner fields are merged back in after the rebuild (see table). Full pipeline details: **[tools/import/README.md](../tools/import/README.md)**.

```bash
npm run import:lorerim -- --install "D:\Wabbajack\Modlists\Lorerim"
npm run import:lorerim -- --install "<path>" --dry-run   # preview only
```

| Updated from plugins | Preserved from existing JSON |
|----------------------|------------------------------|
| Perk tree membership, names, descriptions, `skillReq`, prerequisites (from `AVIF` / `PERK` metadata) | Perk `position` and `grid` (matched by skill + name; multi-rank stacks share one cell) |
| Default layout for **new** perks (curated coords or prerequisite graph) | `costsPerkPoint: false` per perk name; Smithing book-unlock perks auto-set free |
| Traits from `Traits_AbilityList` (traits without a plugin record are dropped) | — |
| Race names, descriptions, ability bonuses, starting skills/attributes from `RACE` `DATA` | `speedBonus` / `attributeBonus` when not in `DATA` |
| `race-effects.json` (parsed from race ability bonus text) | — |
| Birthsign names, bonuses, groups; `effects` re-parsed from bonus text | — |
| Deity names, shrine/follower/devotee/tenets text, racial starting deities, shrine locations | — (deity `effects` re-parsed from shrine text each import) |
| `perk-player-level-reqs.json` from `PERK` `GetLevel` conditions | Player level reqs for perks whose graph key still exists after rebuild |
| `manifest.json` → `version` (from installed Wabbajack list) | `manifest.json` limits, skills, and other fields |
| Destiny tree from `DAR_Perk*` + Subclasses config (layout from config) | Destiny perk `id`, `effects`, and `costsPerkPoint: false` when present in previous `destiny.json` |

After metadata enrichment, **stable perk `id`, prerequisite wiring, explicit `costsPerkPoint: true`, and hand-tuned `effects`** are restored from the previous perk JSON via graph snapshots (matched by skill + name + `skillReq`).

Files import **does not** touch: `mechanics.json`, `stats.json`, `skills.json`, `character-options.json`, or anything under `ui/`.

---

## After you change data

1. Review the git diff.
2. Run `npm run build` — TypeScript compile + schema validation via the loader.
3. Run `npm test` — includes `src/data/loader.test.ts`, which validates bundled JSON against Zod schemas.
4. Run `npm run dev` and spot-check perk trees, race/trait pickers, and derived stats.
5. Bump `manifest.json` → `version` when syncing to a new LoreRim release (shown in the UI). `import:lorerim` sets this automatically from your install's Wabbajack list.

---

## Game files reference

### `manifest.json`

Top-level planner config.

| Field | Purpose |
|-------|---------|
| `version` | LoreRim modpack version label shown in the UI (Wabbajack list version; set automatically by `import:lorerim`) |
| `name` | Display name for the data set |
| `limits` | `majorSkills`, `minorSkills`, `traits`, `initialAttributePoints` |
| `skills` | Ordered list of skill ids — must stay in sync with `skills.json` and `perks/index.json` |
| `nonAllocatableSkills` | Skills excluded from major/minor pickers and skill-point spending (e.g. `destiny`, `traits`) |

### `mechanics.json`

All economy and derived-stat math. Do not duplicate these values in TypeScript.

**`leveling`** — player level, skill/perk point rates, attribute points per level, skill level cost tiers, training cap (`maxTrainingSkillLevel`), skill floor sources for free baseline levels.

**`oghmaInfinium`** — perk points and attribute bonus tuple bound to the Oghma character option.

**`majorSkillBonus` / `minorSkillBonus`** — flat skill level bonuses applied when a skill is chosen as major/minor.

**`derivedStats`** — formulas for stats like magic resist and regen: `prefactor`, `threshold`, `weights` on health/magicka/stamina, and `isPercent` for display.

Schema enforces `maxSkillLevel ≥ highest skillLevelCosts tier` and `maxTrainingSkillLevel ≤ maxSkillLevel`.

### `skills.json`

One entry per skill: `id`, `name`, `category`, `majorEligible`, `minorEligible`. Special skills (`destiny`, `traits`) set both eligibility flags to `false`.

### `stats.json`

Catalog for the derived-stats panel.

- **`categories`** — grouping labels in the UI.
- **`stats`** — each stat: `id`, `label`, `category`, `valueKind` (`flat` | `percent` | `flag`).
- **`raceBindings`** — maps stat ids to race JSON fields (e.g. `unarmedDamage` → `race.unarmedDamage`).

When adding a new `derivedStat` effect, add the stat here first so labels and value kinds resolve correctly.

### `races.json`

Array of races under `races`. Each race includes:

- Display: `id`, `name`, `description`, `bonuses` (human-readable bullet strings)
- Starting values: `startingAttributes`, `startingSkills`, `startingCarryWeight`, `regen`, `speedBonus`, `unarmedDamage`
- `attributeBonus` — per-level attribute growth from race
- `effects` — inline structured effects (usually empty; see `race-effects.json`)

Include a `none` entry for “no race selected”. Import updates names, descriptions, bonuses, and starting values from plugins; hand-tune `speedBonus`, `attributeBonus`, and other fields not present in `RACE` `DATA`.

### `race-effects.json`

Map of `raceId → Effect[]`. Merged into the race at load time (appended to `race.effects`). Keeps structured bonuses separate from long description text. Prefer this for resistances, flags, and derived stat modifiers.

### `traits.json`

`traits` array: `id`, `name`, `description`, `effects`. Trait count limit comes from `manifest.limits.traits`. Alduin bonus trait slot is controlled via `character-options.json`, not here.

### `birthsigns.json` / `deities.json`

Picker content under `birthsigns` / `deities`. Each entry has display fields plus `effects` for computed stats. Include a `none` entry. Text fields are imported from Big Tweaks birthsign records / Wintersun plugins. `effects` are re-parsed from imported bonus/shrine text each run (rule-based patterns in the import tool).

### `character-options.json`

Optional setup choices beyond race/stone/deity.

Each option: `id`, `titleLabel`, `defaultChoice`, `choices[]`, optional `extension`, optional `controlType` (`select` | `toggle` | `buttons`).

- **`titleLabel` / choice `label`** — keys into `labels.json` → `panels.character-options` (not literal UI text).
- **`extension`** — references a build-time plugin in [`extensions/character-options/`](../extensions/README.md) for complex rewards (Oghma paths, cap-bypassing skill grants).
- **`choice.effects`** — simple modifiers (`perkPoints`, `traitSlot`, `attribute`, etc.) when no extension is needed (e.g. Alduin trait slot).
- **`controlType`** — generic UI when the extension does not supply a custom `Control` component.

Add matching label keys under `labels.panels.character-options` when adding options. See **[extensions/README.md](../extensions/README.md)** for plugin authoring.

### `perk-player-level-reqs.json`

Flat map: `"perk-id": minimumPlayerLevel`.

```json
{
  "speech-shout-focus": 10,
  "speech-shout-focus-2": 20
}
```

The app reads `perk.playerLevelReq` only — **do not** parse `[Requires Level N]` from descriptions in code. When a perk gains a player level gate, add it here.

### Perk trees (`perks/`)

**`index.json`** — maps skill id → filename. Every combat/crafting skill in `manifest.skills` that has a tree must appear here (except `traits`, which uses `traits.json` instead).

**`<skill>.json`** — one tree per file:

```json
{
  "skillId": "block",
  "skillName": "Block",
  "grid": { "width": 25, "height": 25 },
  "perks": [ /* ... */ ]
}
```

Each perk node:

| Field | Required | Notes |
|-------|----------|-------|
| `id` | yes | Stable slug, globally unique; use `<skill>-<kebab-name>` |
| `name` | yes | Display name; importer matches plugins by normalized name |
| `skillReq` | yes | Minimum skill level; `0` means no skill gate |
| `position` | yes | `{ x, y }` grid cell; must be inside `grid` bounds |
| `prerequisites` | yes | Array of perk ids; **all** must be selected |
| `prerequisitesAny` | no | Array of perk ids; **at least one** must be selected |
| `description` | yes | Tooltip text; mechanical detail for players |
| `effects` | yes | Usually `[]`; structured effects when modeled in the planner |
| `extension` | no | References [`extensions/perks/`](../extensions/README.md) for dynamic or non-stat perks (e.g. Haggling, Artifact Enchanter) |
| `costsPerkPoint` | no | Default `true`; set `false` for free nodes (e.g. Destiny root, some Smithing nodes) |
| `playerLevelReq` | no | **Avoid inline** — use `perk-player-level-reqs.json` instead |

**Adding a new perk**

1. Choose a unique `id` and grid `position` (no overlap with another node).
2. Wire `prerequisites` / `prerequisitesAny` to existing ids.
3. Set `skillReq` to match in-game gating.
4. Add player level req to `perk-player-level-reqs.json` if needed.
5. Set `costsPerkPoint: false` only when the perk is free in LoreRim.

**Adding a new skill tree**

1. Add the skill to `manifest.skills`, `skills.json`, and `perks/index.json`.
2. Create `perks/<skill-id>.json` with `skillId` matching the id.
3. Run `npm run build` and verify in the data editor or planner UI.

**Destiny tree** — `destiny.json` uses the same schema. Rebuilt each import from `DAR_Perk*` records and the Subclasses of Skyrim config (`CustomSkill.destiny.config.txt`) for positions and prerequisite links (OR via `prerequisitesAny`). Destiny perks cost destiny points unless marked `costsPerkPoint: false`. Stable perk `id` and hand-tuned `effects` are preserved from the previous file when graph keys match.

---

## Effect objects

Used in races, race-effects, traits, standing stones, deities, perks, and character option choices. Defined in `src/data/schemas/index.ts`.

```json
{ "type": "attribute", "stat": "health", "value": 50 }
```

```json
{ "type": "derivedStat", "stat": "magicResist", "value": 15, "isPercent": true }
```

```json
{ "type": "skillPointsPerLevel", "value": 2 }
```

```json
{ "type": "flag", "stat": "waterbreathing" }
```

```json
{ "type": "perkPoints", "value": 3 }
```

```json
{ "type": "traitSlot", "value": 1 }
```

- **`attribute`** — `stat` is `health`, `magicka`, or `stamina`; flat bonus to attributes.
- **`derivedStat`** — `stat` must exist in `stats.json` (or `mechanics.derivedStats` for formula-driven stats). Set `isPercent` when the value is a percentage; omit or match `stats.json` `valueKind`.
- **`skillPointsPerLevel`** — extra skill points earned each level up.
- **`flag`** — boolean ability; `stat` id should use `valueKind: "flag"` in `stats.json`.
- **`perkPoints`** — bonus perk points added to the build budget (character options, etc.).
- **`traitSlot`** — extra trait slot beyond `manifest.limits.traits`.

Perk `effects` are often empty because mechanical detail lives in `description` text. Populate `effects` when the planner should show the bonus in derived stats, or add an **`extension`** plugin when logic is dynamic (skill-scaled stats, crafting rules). See [`extensions/README.md`](../extensions/README.md).

---

## UI files reference

### `theme.json`

`mode` (`dark` | `light`), `colors`, `fonts`, `radius`, `shadows`. Color keys are referenced from CSS via the theme provider — add new keys only if the app reads them.

### `layout.json`

Column-based planner layout:

```json
{
  "columns": [
    { "width": "300px", "panels": ["character-setup"] },
    { "width": "1fr", "panels": ["skill-trees"] },
    { "width": "340px", "panels": ["skill-trees-sidebar"] }
  ]
}
```

Valid panel ids are registered in `src/layout/panelRegistry.ts` (re-exported from `LayoutRenderer.tsx`):

| Panel id | Component |
|----------|-----------|
| `character-setup` | Left column: race, stone, deity, traits, skills |
| `skill-trees` | Center: perk trees and workspace |
| `skill-trees-sidebar` | Right: skill list / navigation |

Unknown panel ids render a visible error in the layout. Adding a new panel requires a React component **and** a registry entry — layout alone is not enough.

### `labels.json`

All user-facing strings. Structure is validated by schema; missing keys break typed UI access.

| Section | Purpose |
|---------|---------|
| `app` | Title, subtitle, version label, footer |
| `nav` | Route labels |
| `landing` | Home page copy |
| `milestones` | Build variants / milestone UI |
| `level-bar` | Player level, perk/skill/training point tooltips and warnings |
| `panels` | Nested map: `panels.<panelId>.<key>` |
| `errors` | Load and validation error messages |

Character option labels live under `panels.character-options`. Keys referenced from `character-options.json` (`titleLabel`, choice `label`, etc.) must exist there.

Use `{name}` / `{level}` style placeholders where the app substitutes values (see existing `milestones` and `level-bar` strings).

---

## Cross-file consistency checklist

When adding or renaming content, verify:

- [ ] Skill `id` appears in `manifest.skills`, `skills.json`, and (if applicable) `perks/index.json`
- [ ] Perk `id` is unique across **all** perk tree files
- [ ] Every `prerequisites` / `prerequisitesAny` entry references an existing perk `id`
- [ ] `perk-player-level-reqs.json` keys match real perk ids
- [ ] `race-effects.json` keys match `races.json` race ids
- [ ] New `derivedStat` effects reference ids in `stats.json`
- [ ] New character options have label keys in `labels.panels.character-options`
- [ ] `manifest.limits` align with UI expectations (major/minor/trait counts)

---

## Schema source of truth

Field types, optional defaults, and cross-field rules live in **`src/data/schemas/index.ts`**. When unsure whether a shape is valid, check the Zod schema for that file before guessing.

TypeScript types (`Perk`, `Race`, `Effect`, etc.) are inferred from those schemas — keep JSON aligned with them.

---

## Common mistakes

| Mistake | Correct approach |
|---------|------------------|
| Putting player level reqs in perk descriptions only | Add to `perk-player-level-reqs.json` |
| Setting `skillReq` thinking it spends perk points | Skill level is separate; perk points are spent per node |
| Hardcoding `20`, `50`, `100` caps in JSON or TS | Use `mechanics.json` fields |
| Expecting import to leave prerequisites/`skillReq` untouched | Import rebuilds from plugins, then restores saved prerequisite wiring and effects via graph snapshots; edit tree JSON or use the data editor for layout |
| Forgetting `perks/index.json` after adding a tree file | Loader throws “Missing perk tree file” |
| Duplicate perk ids across trees | Prerequisites and build codec assume global uniqueness |
| Literal text in `character-options.json` | Use label keys into `labels.json` |

---

## Related docs

| Doc | Contents |
|-----|----------|
| [root `README.md`](../README.md) | Project overview, quick start, deployment |
| [`tools/import/README.md`](../tools/import/README.md) | LoreRim import pipeline |
| [`tools/data-editor/README.md`](../tools/data-editor/README.md) | Visual JSON editor |
| [`src/README.md`](../src/README.md) | App source layout and tests |
| [`.cursor/rules/giga-planner-data-model.mdc`](../.cursor/rules/giga-planner-data-model.mdc) | Agent/editor rules for economy and perks |
| [`src/data/loader.ts`](../src/data/loader.ts) | Load order and merges |
| [`src/data/schemas/index.ts`](../src/data/schemas/index.ts) | Validation rules |
