# Gear and enchantment import (planned — phase 3)

Future domain importer for player equipment, enchantments, and related crafting data.

## Planned record types

| Record | Use |
|--------|-----|
| `WEAP` | Weapons — base stats, keywords |
| `ARMO` | Armor — armor rating, slot, keywords |
| `ENCH` | Enchantments — linked MGEF effects |
| `COBJ` | Crafting recipes (optional) |

## Planned output

- `data/game/items.json` or per-category files (TBD)
- Reuses `lib/effects/` for enchantment → planner `Effect[]` mapping

## ImportContext extension

```js
scan: {
  weaponRecords: [],
  armorRecords: [],
  enchantRecords: [],
  mgefIndex: Map,
}
```

Extend [`esp-reader.mjs`](../esp-reader.mjs) `IMPORT_RECORD_TYPES` when this phase begins.
