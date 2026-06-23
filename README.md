<div align="center">

# Lorerim GigaPlanner Plus

**Plan your LoreRim character from level 1 to endgame — perks, skills, destiny, and live combat stats in one place.**

[![Live planner](https://img.shields.io/badge/Open_planner-GitHub_Pages-2563eb?style=for-the-badge)](https://watchis.github.io/Lorerim-GigaPlannerPlus/)

A free build planner for [LoreRim](https://www.lorerim.com/) players. No install, no account — open the site and start planning.

[Open the planner](https://watchis.github.io/Lorerim-GigaPlannerPlus/) · [Report an issue](https://github.com/watchis/Lorerim-GigaPlannerPlus/issues)

</div>

---

## Getting started

1. **[Open the planner](https://watchis.github.io/Lorerim-GigaPlannerPlus/)** in your browser.
2. **Set up your character** — race, birthsign, deity, traits, major/minor skills, and attribute choices.
3. **Spend your points** — pick perks, raise skill levels, plan training and destiny as you level up.
4. **Save and revisit** — your work auto-saves in the browser. Come back anytime on the same device.

---

## What you can plan

| | |
|---|---|
| **Character setup** | Every starting choice with live validation against LoreRim rules and race bonuses. |
| **Full perk trees** | Every skill tree with prerequisites, skill gates, player level requirements, and multi-rank perks. |
| **Destiny & training** | Destiny points and skill training alongside perk points and tiered skill-point costs. |
| **Build variants** | Snapshots at key levels so you can map your leveling path without losing your main plan. |
| **Live combat stats** | Health, magicka, stamina, and tracked bonuses update as you change setup and perks. |
| **Share & backup** | Compact build codes, planner links, and `.gpp` backup files. |

---

## Sharing builds

From **My Builds** or the planner summary panel you can:

- **Copy a build code** — a short string you can paste to a friend or forum post.
- **Copy a planner link** — opens the planner with your build already loaded.
- **Export a `.gpp` file** — a backup you can import later from the builds page.
- **Import a code or file** — paste a share code or drop a `.gpp` file to load someone else's build.

Builds are stored **locally in your browser**. Clearing site data or switching browsers will remove saved builds unless you exported a code or backup file.

---

## Tips

- Use the **level bar** at the top of the planner to change player level and see what unlocks.
- **Variants** let you record how your build should look at milestone levels (e.g. level 20, 50, endgame).
- Hover or click perks in the tree to see requirements before you spend points.
- If a perk is greyed out, check skill level, prerequisite perks, or player level gates.

---

## Questions or problems?

Something wrong with perk data, a broken share code, or a UI bug? [Open an issue](https://github.com/watchis/Lorerim-GigaPlannerPlus/issues) on GitHub.

---

## For contributors

This project is open source ([MIT](LICENSE)). Developer documentation lives elsewhere so this page stays focused on players:

| Doc | Contents |
|-----|----------|
| [`src/README.md`](src/README.md) | App architecture, npm scripts, and tests |
| [`data/README.md`](data/README.md) | Game data files and progression systems |
| [`tools/import/README.md`](tools/import/README.md) | Refresh perk data from a local LoreRim install |
| [`tools/data-editor/README.md`](tools/data-editor/README.md) | Local JSON editor for game data |
| [`.github/CI.md`](.github/CI.md) | CI, Dependabot, and GitHub Pages deployment |
