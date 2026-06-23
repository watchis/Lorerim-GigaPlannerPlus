import { discoverInstall, summarizePluginSources } from "./lib/lorerim-install.mjs";

const installPath = process.argv[2] ?? "D:/Wabbajack/Modlists/Lorerim";
const install = discoverInstall(installPath);

const watchPlugins = [
  "Ordinator - Perks of Skyrim.esp",
  "Requiem.esp",
  "Biggie Traits.esp",
  "LoreRim - Global Modifiers.esp",
  "Synthesis - Gameplay Overwrite.esp",
  "LoreRim - Spells and Magic Effects.esp",
];

const watched = watchPlugins.map((pluginName) => {
  const hit = install.plugins.find((plugin) => plugin.pluginName === pluginName);
  return {
    pluginName,
    modName: hit?.modName ?? null,
    path: hit?.path ?? null,
  };
});

const xEditCount = install.plugins.filter(
  (plugin) => plugin.modName === "LoreRim - xEdit64 Output",
).length;
const synthesisCount = install.plugins.filter(
  (plugin) => plugin.modName === "LoreRim - Synthesis Output",
).length;

console.log(
  JSON.stringify(
    {
      profile: install.profile,
      pluginsResolved: install.plugins.length,
      enabledMods: install.enabledMods.length,
      fromXEditOutput: xEditCount,
      fromSynthesisOutput: synthesisCount,
      topSources: summarizePluginSources(install.plugins).slice(0, 12),
      watched,
    },
    null,
    2,
  ),
);
