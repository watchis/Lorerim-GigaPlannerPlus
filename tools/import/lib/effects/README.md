# Plugin effect extraction

Shared logic for reading structured effects from Skyrim plugin records instead of parsing description text.

## Modules

| Module | Purpose |
|--------|---------|
| `mgef-index.mjs` | Index all `MGEF` records from the import scan |
| `spell-to-effects.mjs` | Map `SPEL` EFID/EFIT + MGEF archetype → planner `Effect[]` |
| `resolve-effects.mjs` | Hybrid: plugin effects first, `parseBonusEffects` fallback |

## Consumers

- `importers/traits.mjs`
- `importers/races.mjs`
- `importers/birthsigns.mjs`
- Future: `importers/gear.mjs`, perk ability chains

## Existing building blocks

- [`spell-magnitude.mjs`](../spell-magnitude.mjs) — EFID/EFIT reading
- [`deity-faith-from-plugins.mjs`](../deity-faith-from-plugins.mjs) — MGEF template + magnitude substitution (Wintersun)
- [`parse-bonus-effects.mjs`](../parse-bonus-effects.mjs) — text fallback

## Hybrid behavior

`resolveEffects()` parses bonus text first, then adds plugin-mapped stats that text did not already produce. Script-based or partial plugin chains therefore cannot drop text-parsed race, birthsign, or trait effects.
