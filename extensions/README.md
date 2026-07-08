# GigaPlanner extensions

Build-time plugins for **complex character options** and **perks** whose behavior cannot be expressed cleanly as flat JSON `effects`.

The main app exposes a stable API in [`src/extension-api/`](../src/extension-api/). Extensions live here and are auto-discovered at build time — you do not edit `buildEngine.ts` or panel components when adding a new plugin.

## Folders

| Folder | Purpose |
|--------|---------|
| `character-options/` | Optional playthrough rewards (Oghma Infinium, etc.) |
| `perks/` | Perk nodes with dynamic or non-stat behavior (Haggling, Artifact Enchanter) |

Naming rule: **file basename = `extension` field in JSON = `id` in the extension module**.

## When to use what

| Complexity | Use |
|------------|-----|
| Flat modifier (`+20% prices`, `+1 trait slot`) | JSON `effects` on the perk or character-option choice |
| Skill-scaled stat, cap-bypass grants, path tables | Extension `.ts` file |
| Crafting rules / display-only notes | Extension `plannerNotes` |

**Example:** Merchant keeps `effects: [{ "type": "derivedStat", "stat": "priceModifier", "value": 20, "isPercent": true }]` in JSON. Haggling uses an extension because prices scale with Speech level (`1%` per level).

## Workflow

### Character option

1. Add entry to [`data/game/character-options.json`](../data/game/character-options.json) with `extension: "<id>"`, `controlType`, labels, and choices.
2. Add label keys under `data/ui/labels.json` → `panels.character-options`.
3. Create `extensions/character-options/<id>.ts` implementing `defineCharacterOption`.
4. Add co-located `<id>.test.ts`.
5. Run `npm test` and `npm run build`.

### Perk

1. Add `"extension": "<perk-id>"` to the perk node in `data/game/perks/<skill>.json`.
2. Create `extensions/perks/<perk-id>.ts` implementing `definePerk`.
3. Add co-located test file.
4. Run `npm test`.

Scaffold a stub:

```bash
npm run regen:extension-stub -- --type perk speech-haggling
npm run regen:extension-stub -- --type character-option my-option
```

## API reference

Import from `@/extension-api`:

- `defineCharacterOption`, `definePerk`
- `BuildModification` — `effects`, `skillLevelGrants`, `plannerNotes`, `conditionalNotes`
- `scaleDerivedStatBySkillLevel(stat, skillLevel, percentPerLevel, opts?)`

### Character option example (Oghma)

See [`character-options/oghma-infinium.ts`](character-options/oghma-infinium.ts):

- `perkPoints` effect (+3)
- `skillLevelGrants` with `bypassPlayerLevelCap` and `bypassSkillIncreaseLimit` (+5 to six path-specific skills)

### Perk examples

- [`perks/speech-haggling.ts`](perks/speech-haggling.ts) — skill-scaled `priceModifier`
- [`perks/enchanting-artifact-enchanter.ts`](perks/enchanting-artifact-enchanter.ts) — `plannerNotes` in perk tooltips

## Testing

Co-locate `*.test.ts` beside each extension. Run the full suite with `npm test`.

Loader validation (`validateExtensionRegistry`) ensures every `extension` id in game JSON exists here, and every file here is referenced in data.

## Regenerating JSON effects (perks/traits)

Flat perk/trait effects are still authored via JSON and the import parser:

```bash
npm run regen:effects
```

Run after bulk text changes to refresh `effects` arrays in `data/game/`. Extension perks skip runtime parsing when `extension` is set.

Importer wiring: add perk bindings to [`data/game/extension-bindings.json`](../data/game/extension-bindings.json) so `import:lorerim` sets `"extension"` on the matching perk node. Character options set `extension` directly in `character-options.json` (import validates against the same registry).

## API evolution

New engine capabilities (new modification types) require a one-time change to `src/extension-api/` and the build collector. Extensions cannot invent semantics the API does not expose.

After a new capability lands, subsequent plugins only need a new file under `extensions/` plus JSON metadata.
