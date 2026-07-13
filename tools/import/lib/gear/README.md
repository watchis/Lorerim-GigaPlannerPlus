# Gear and enchantment import

Domain importer for player equipment and enchantments.

## Record types

| Record | Use |
|--------|-----|
| `WEAP` | Weapons — damage, weight, value, anim type, keywords, `EITM` |
| `ARMO` | Armor — rating, slot flags, armor type, keywords, `EITM` |
| `ENCH` | Enchantments — linked MGEF effects via EFID/EFIT |
| `KYWD` | Keyword editor IDs for filters / static hints |

## Output

- `data/game/items/index.json`
- `data/game/items/weapons.json`
- `data/game/items/armor.json`
- `data/game/items/enchantments.json`

## Run

```bash
npm run import:lorerim -- --install "D:\Wabbajack\Modlists\Lorerim" --only gear --rescan-plugins
```

`--rescan-plugins` is required after first enabling gear types so the non-mechanics skip cache is rebuilt.
