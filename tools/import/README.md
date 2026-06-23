# Updating planner data

Scripts in this folder regenerate `data/game/` from a local LoreRim MO2 install.

**Not deployed:** like `tools/data-editor/`, this folder is dev-only. GitHub Pages publishes `dist/` from the main Vite build, which does not include `tools/import/`.

## Quick start

```bash
npm run import:lorerim -- --install "D:\Wabbajack\Modlists\Lorerim"

npm run import:lorerim -- --install "D:\Wabbajack\Modlists\Lorerim" --dry-run
```

## What `import:lorerim` does

`import-lorerim.mjs` reads **Skyrim plugin files** (`.esp` / `.esm`) from your LoreRim install.

1. **MO2 profile** — active profile from `ModOrganizer.ini` (`modlist.txt` + `loadorder.txt`)
2. **Plugin files** — each plugin in load order is read from the winning MO2 mod folder (`modlist.txt`, bottom wins), except **`LoreRim - xEdit64 Output`** and **`LoreRim - Synthesis Output`**, which always override the same plugin name from upstream mods
3. **Records** — when the same Editor ID appears in multiple plugins, the **last** plugin in `loadorder.txt` wins

| Game source | Planner output |
|-------------|----------------|
| Requiem `REQ_*`, LoreRim `Feat_Perk_*` / `LoreRimTrapper_*` / `BOOB_*`, Ordinator `ORD_*`, and Wayfarer `FURY_Perk_*` / `BBWayfarer*` records | `data/game/perks/*.json` (text updates; layout preserved; stale perks removed) |
| Subclasses of Skyrim `DAR_Perk*` + `CustomSkill.destiny.config.txt` | `data/game/perks/destiny.json` (layout preserved from previous JSON; config used for membership/links) |
| Biggie Traits `Traits_AbilityList` (FLST + FLM patches) trait ability spells | `data/game/traits.json` |
| Playable races | `data/game/races.json` |
| Big Tweaks `REQ_Ability_Birthsign_*` + `doom*MSG` | `data/game/birthsigns.json` |
| Wintersun altar deity MGEF descriptions + worship tenets | `data/game/deities.json` |

### CLI options

| Flag | Description |
|------|-------------|
| `--install`, `-i <path>` | LoreRim install root (**required**; must contain `ModOrganizer.exe`) |
| `--dry-run` | Parse and print a summary without writing files |
| `--plugin-limit <n>` | Scan only the first N plugins (debug) |
| `--help`, `-h` | Show usage |

### Runtime

A full LoreRim load order is ~3,500 plugins. The importer reads each plugin **once** (PERK, AVIF, SPEL, RACE, MESG, QUST, Wintersun MGEF, altar blessings, and trait FormList data in a single pass) with parallel I/O across up to 8 plugins at a time. Expect the scan to take **about one minute** on a fast SSD (previously several minutes with repeated full scans).

Set `IMPORT_PLUGIN_CONCURRENCY` to tune parallel plugin reads (default `8`).

### Modpack version

`import:lorerim` updates `data/game/manifest.json` → `version` from the installed LoreRim Wabbajack list (the `Version` field inside the `.wabbajack` file, e.g. `5.0.3.2`). Detection works like this:

1. Read LoreRim-authored download fingerprints from `<install>/downloads/` (Nexus mod `112590` archives such as DynDOLOD / grass cache outputs).
2. Find candidate `.wabbajack` files in the install downloads folder and in sibling `Wabbajack/*/downloaded_mod_lists/` folders (walking up from the install path to locate `Wabbajack.exe`).
3. Match the candidate whose archive list contains those fingerprints, then use its embedded modlist version.
4. Fallback: `LoreRim.compiler_settings` → `Version` on dev/author installs. If nothing matches, the existing manifest version is kept and a warning is printed.

This is the same version Wabbajack shows for the list.

### Merge behavior

The importer **rebuilds** perk trees, traits, races, birthsigns, and deities from plugin records each run. Existing entries in those files are not kept as a base — only fields that are not derived from plugins are carried forward (see table below). Stale perk tree files under `data/game/perks/` are deleted after import if they are no longer in the index.

Perk trees are built from the final merged **`AVIF`** perk trees (what the game shows in each skill menu), plus `DAR_Perk*` / Subclasses config for Destiny. Prerequisites and `skillReq` come from `AVIF` / `PERK` metadata; layout uses vendored legacy GigaPlanner coordinates for **new** perks only (see **Position** below). `costsPerkPoint: false` flags and **perk grid positions** are preserved from the previous planner JSON when the same perk name still exists in that skill tree after rebuild.

| Updated from plugins | Preserved from existing JSON |
|----------------------|----------------------------|
| All perk tree nodes (membership, names, descriptions, prerequisites, `skillReq`) | `costsPerkPoint: false` per perk name (hand-tuned free nodes); Smithing book-unlock perks (description mentions reading/studying) are set free automatically |
| Default layout for newly added perks (GigaPlanner coords or prerequisite graph) | Perk `position` and `grid` per skill tree (matched by skill + perk name; multi-rank stacks share one cell) |
| All traits from `Traits_AbilityList` (base FormList + FLM additions) | — |
| Race names, descriptions, ability bonuses (`REQ_Ability_Race_*`), starting skills/attributes from RACE `DATA` | `race-effects.json`, race `speedBonus` / `attributeBonus` when not in `DATA` |
| Birthsign names, bonuses, groups | Birthsign `effects` when already hand-tuned (non-empty) |
| Deity names, shrine/follower/devotee/tenets text, racial starting deities, can-follow races, shrine locations (lorerim.com guide) | Deity `effects` |
| `manifest.json` → `version` (from installed Wabbajack list) | `manifest.json` limits, skills, and other fields |

When `effects` is empty, the importer parses the `bonus` text with rule-based patterns in `lib/parse-bonus-effects.mjs` (percent modifiers, attribute flat bonuses, common weapon/resist phrases). Conditional or narrative-only bonuses may stay empty until rules are extended.

Perk **membership** comes from `AVIF`. Each `AVIF` `PNAM` perk reference and each `PERK` record's form ID is resolved to a global identity (`definingPlugin|baseId`) using that plugin's `TES4` master list (`lib/formid.mjs`), rather than masking to the low 24 bits. This is required because unrelated forms from different masters can share the same low bytes (e.g. the Smithing tree's `Tailoring & Polishing` collides with `Armed Spellcasting` and `Polishing`), and a plugin that overrides a perk references it through its own master table. Perks displayed in a skill's `AVIF` tree are kept; those that pass the `REQ_*` / `ORD_*` prefix filter but are **not** in any `AVIF` tree are ignored. **Exception:** `BOOB_*` speech perks (Bardic Boons) are player-visible in the Speech tree but are not linked from any `AVIF` `PNAM` section; those are appended via supplemental prefix import and anchored like `AVIF` perks during orphan pruning. If no `AVIF` data is found (debug scans), the importer falls back to the prefix filter.

Perk metadata enrichment uses plugin `PERK` conditions and `AVIF` links:

- **Skill requirement** — `REQ_*` Editor IDs with `_025_` / `_050_` / `_075_` / `_100_` tiers, else top-level `PERK` conditions (`GetBaseActorValue >= N`). A multi-rank perk's base rank keeps its own record skill requirement (the by-name metadata can't distinguish ranks).
- **Prerequisites** — `GetIsID` perk checks on top-level `PERK` conditions, merged with parent links from the final `AVIF` perk tree for that skill. Self-referential prerequisites (a higher rank's `GetIsID` on its own lower rank) are dropped.
- **Multi-rank perks** — the game shows one `AVIF` node per perk but tracks ranks via the `PERK` `NNAM` (Next Perk) chain. The importer follows that chain and emits one node per rank, all sharing the base node's grid cell, with each rank's own skill requirement (the engine orders a stack by ascending `skillReq`). Higher ranks carry no prerequisites — the stack mechanism gates them. `DATA.numRanks` is ignored because repurposed vanilla forms (e.g. Stealth) leave it stale.
- **Position** — legacy [GigaPlanner](https://multidyls.github.io/GigaPlanner/) coordinates (vendored in `lib/giga-planner-layout.json`) when perk names match and no saved position exists; otherwise a prerequisite-depth layout with the same spacing conventions. Ranks of the same perk are laid out as one unit so they stay co-located. **Saved positions from the existing `data/game/perks/*.json` are restored after import** so manual layout edits survive rebuilds. Destiny keeps its config-based layout.

After metadata enrichment, **unanchored perks are removed** from each tree: nodes with no skill requirement, no prerequisites, no player-level requirement, not referenced as a prerequisite by any other perk, and **not** in that skill's merged `AVIF` tree. Starter nodes (e.g. Novice Destruction) are kept when other perks depend on them; leaf perks shown in `AVIF` (e.g. Gourmet, Metamagic) are kept even when they have no skill gate in plugin data.

**Destiny** is rebuilt each import from `DAR_Perk*` records and the Subclasses of Skyrim Custom Skills config (`mods/Subclasses of Skyrim/NetScriptFramework/Plugins/CustomSkill.destiny.config.txt`) for node positions and prerequisite links. Config links are imported as `prerequisitesAny` (OR). Destiny perks spend **destiny points** (`costsPerkPoint` defaults to true).

### Not imported yet

- `data/game/mechanics.json`

### Never overwritten

- `data/game/perk-player-level-reqs.json`
- `data/game/race-effects.json`
- `data/game/stats.json`
- `data/game/skills.json`
- `data/game/character-options.json`
- `data/ui/*`

---

## Script layout

```
tools/import/
  import-lorerim.mjs       # LoreRim MO2 install → data/game/
  probe-esp.mjs            # debug: inspect PERK/RACE records in one plugin
  generate-giga-planner-layout.mjs # regenerate lib/giga-planner-layout.json from legacy perk data
  lib/
    lorerim-install.mjs    # MO2 discovery, load order, plugin paths
    lorerim-version.mjs    # modpack version from Wabbajack + install fingerprints
    avif-perk-tree.mjs     # AVIF perk tree parser (player-visible layout)
    avif-perk-membership.mjs # AVIF membership index + planner diff helpers
    formid.mjs             # TES4 master list + plugin-local form ID → global identity
    giga-planner-layout.mjs # GigaPlanner-inspired perk positioning during import
    giga-planner-layout.json # static legacy layout coordinates
    plugin-io.mjs          # shared plugin visit/read helpers + concurrent mapper
    esp-reader.mjs         # Skyrim plugin record parser (single-pass batch scan)
    import-reset.mjs       # empty perk shells, hand-tuned overrides, layout preservation, stale file cleanup
    lorerim-transform.mjs  # plugin records → planner JSON
    destiny-config.mjs     # Subclasses of Skyrim destiny tree layout parser
    skill-constants.mjs    # skill id ordering
    transform-utils.mjs    # shared string/json helpers
    parse-bonus-effects.mjs # bonus text → structured effects (rule-based)
    parse-trait-body.mjs    # trait spell text → description + bonus
```

### Debug: inspect a single plugin

```bash
node tools/import/probe-esp.mjs "D:/path/to/SomeMod.esp"
node tools/import/probe-esp.mjs "D:/path/to/SomeMod.esp" RACE
node tools/import/compare-avif-perks.mjs "D:/path/to/Lorerim"
node tools/import/list-missing-perks.mjs "D:/path/to/Lorerim"
node tools/import/probe-plugin-sources.mjs "D:/path/to/Lorerim"
```

---

## After updating

1. Review the git diff under `data/game/`
2. Confirm `manifest.json` → `version` matches your LoreRim install (auto-detected from Wabbajack)
3. Run `npm run build` to validate schemas
4. Run `npm run test:import` (or `npm test`) — unit tests for parsers and merge helpers in `lib/`
5. Spot-check perk trees and trait/race pickers in the dev UI

## Tests

Import helpers have co-located `*.test.mjs` files under `lib/`. They use Node's built-in test runner (assert-based scripts discovered by `node --test`).

```bash
npm run test:import   # from repo root
node --test tools/import/lib/parse-trait-body.test.mjs   # single file
```

When adding parsers or merge logic, add or extend tests in the same folder.

## Data model

Skill levels, perk points, and skill points are separate systems. See `.cursor/rules/giga-planner-data-model.mdc` when editing economy or perk fields by hand.
