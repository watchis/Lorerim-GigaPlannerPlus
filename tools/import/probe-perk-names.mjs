import { discoverInstall } from "./lib/lorerim-install.mjs";
import { collectRecordsFromPlugins } from "./lib/esp-reader.mjs";

const names = [
  "Smithing Specialization",
  "Iron Lore",
  "Animal Riding",
  "Beastmaster",
  "Masterly Strike",
  "Surprise Attack",
  "Strike the Jugular",
  "Master of All",
  "Fog of War",
  "Tripwire",
  "Whiplash",
  "Cloak and Dagger",
  "Greater Vitality",
  "Blood Glutton",
  "Shivering Isles Smithing",
];

const install = discoverInstall(process.argv[2] ?? "D:/Wabbajack/Modlists/Lorerim");
const perks = await collectRecordsFromPlugins(install.plugins, ["PERK"]);

for (const name of names) {
  const exact = perks.filter((p) => p.name === name);
  console.log(`=== ${name}`);
  if (exact.length === 0) {
    const partial = perks.filter((p) =>
      (p.name ?? "").toLowerCase().includes(name.toLowerCase()),
    );
    if (partial.length === 0) console.log("  NONE");
    else {
      for (const p of partial.slice(0, 5)) {
        console.log(`  ~ ${p.edid} | ${JSON.stringify(p.name)}`);
      }
    }
    continue;
  }

  for (const p of exact.slice(0, 6)) {
    const plugin = p.plugin?.split(/[/\\]/).pop();
    console.log(`  ${p.edid} | ${JSON.stringify(p.name)} | ${plugin}`);
  }
}
