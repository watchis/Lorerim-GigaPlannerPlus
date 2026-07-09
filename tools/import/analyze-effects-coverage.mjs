/**
 * Compare text-parsed vs plugin-resolved effects for traits/races/birthsigns.
 * Usage: node tools/import/analyze-effects-coverage.mjs --install <path>
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { discoverInstall } from "./lib/lorerim-install.mjs";
import { filterPluginsForImport } from "./lib/plugin-skip-cache.mjs";
import { buildImportContext } from "./lib/import-context.mjs";
import { parseImportArgs } from "./lib/import-cli.mjs";
import { parseBonusEffects } from "./lib/parse-bonus-effects.mjs";
import { spellRecordToEffects } from "./lib/effects/spell-to-effects.mjs";
import { resolveEffects } from "./lib/effects/resolve-effects.mjs";
import { collectTraitAbilitySpells } from "./lib/trait-ability-list.mjs";
import { transformStandingStoneRecords } from "./importers/birthsigns.mjs";
import { transformRaceRecords } from "./importers/races.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..");
const dataDir = join(repoRoot, "data", "game");

function effectKey(effect) {
  return `${effect.type}:${effect.stat ?? ""}:${effect.value ?? ""}:${effect.isPercent ?? ""}`;
}

function summarizeEffects(effects) {
  return effects.map(effectKey).sort().join("|");
}

function compareSets(textEffects, pluginEffects, resolvedEffects) {
  const textKeys = new Set(textEffects.map(effectKey));
  const pluginKeys = new Set(pluginEffects.map(effectKey));
  const resolvedKeys = new Set(resolvedEffects.map(effectKey));

  return {
    textCount: textEffects.length,
    pluginCount: pluginEffects.length,
    resolvedCount: resolvedEffects.length,
    pluginOnly: [...pluginKeys].filter((key) => !textKeys.has(key)),
    textOnly: [...textKeys].filter((key) => !pluginKeys.has(key)),
    resolvedUsesPlugin: pluginKeys.size > 0 && [...resolvedKeys].every((k) => pluginKeys.has(k)),
    resolvedUsesText: pluginKeys.size === 0 && resolvedKeys.size > 0,
  };
}

async function analyzeTraits(context) {
  const traitSpells = await collectTraitAbilitySpells(
    context.plugins,
    context.install.installDir,
    context.install.enabledMods,
    context.scan.spellRecords,
    {
      traitsFormList: context.scan.traitsFormList,
      mastersByPath: context.scan.mastersByPath,
    },
  );

  const pluginPathByName = new Map(
    context.plugins.map((plugin) => [plugin.pluginName.toLowerCase(), plugin.path]),
  );

  const rows = [];
  let withPluginEffects = 0;
  let withTextEffects = 0;
  let pluginWins = 0;
  let textFallback = 0;
  let bothEmpty = 0;
  let pluginAddsBeyondText = 0;
  let textHasMore = 0;

  for (const spell of traitSpells) {
    const bonus = spell.description ?? "";
    const textEffects = parseBonusEffects(bonus);
    const pluginPath = pluginPathByName.get(String(spell.plugin ?? "").toLowerCase());
    const masters = pluginPath ? (context.scan.mastersByPath.get(pluginPath) ?? []) : [];
    const pluginEffects = spellRecordToEffects(spell, context.derived.mgefIndex, masters);
    const resolved = resolveEffects({
      bonusText: bonus,
      spellRecords: spell,
      mgefIndex: context.derived.mgefIndex,
      mastersByPath: context.scan.mastersByPath,
      plugins: context.plugins,
    });

    const cmp = compareSets(textEffects, pluginEffects, resolved);
    if (pluginEffects.length > 0) withPluginEffects++;
    if (textEffects.length > 0) withTextEffects++;
    if (cmp.resolvedUsesPlugin) pluginWins++;
    else if (cmp.resolvedUsesText) textFallback++;
    else if (resolved.length === 0) bothEmpty++;
    if (cmp.pluginOnly.length > 0) pluginAddsBeyondText++;
    if (cmp.textOnly.length > 0 && pluginEffects.length > 0) textHasMore++;

    rows.push({
      edid: spell.edid,
      name: spell.name,
      ...cmp,
      hasEffectEntries: (spell.effectEntries?.length ?? 0) > 0,
      effectEntryCount: spell.effectEntries?.length ?? 0,
    });
  }

  return {
    total: rows.length,
    withPluginEffects,
    withTextEffects,
    pluginWins,
    textFallback,
    bothEmpty,
    pluginAddsBeyondText,
    textHasMore,
    rows: rows.sort((a, b) => a.name.localeCompare(b.name)),
  };
}

function analyzeBirthsigns(context) {
  const result = transformStandingStoneRecords(
    context.scan.spellRecords,
    context.scan.mesgRecords,
    join(dataDir, "birthsigns.json"),
    context.derived,
    { mastersByPath: context.scan.mastersByPath },
    context.plugins,
  );

  const rows = [];
  for (const sign of result.birthsigns) {
    if (sign.id === "none") continue;
    const spell = context.scan.spellRecords.find(
      (record) => record.edid === `REQ_Ability_Birthsign_${sign.name}`,
    );
    const textEffects = parseBonusEffects(sign.bonus);
    const pluginPath = spell
      ? context.plugins.find((p) => p.pluginName === spell.plugin)?.path
      : null;
    const masters = pluginPath ? (context.scan.mastersByPath.get(pluginPath) ?? []) : [];
    const pluginEffects = spell
      ? spellRecordToEffects(spell, context.derived.mgefIndex, masters)
      : [];

    rows.push({
      id: sign.id,
      name: sign.name,
      textCount: textEffects.length,
      pluginCount: pluginEffects.length,
      resolvedCount: sign.effects.length,
      hasSpell: Boolean(spell),
      effectEntries: spell?.effectEntries?.length ?? 0,
    });
  }

  return rows;
}

function analyzeRaces(context) {
  const { raceEffects } = transformRaceRecords(
    context.scan.raceRecords,
    context.scan.spellRecords,
    join(dataDir, "races.json"),
    context.scan.lorerimRaceRecords,
    context.derived,
    { mastersByPath: context.scan.mastersByPath },
    context.plugins,
  );

  const committed = JSON.parse(readFileSync(join(dataDir, "race-effects.json"), "utf8"));
  const rows = [];

  for (const [raceId, effects] of Object.entries(raceEffects)) {
    const textEffects = committed[raceId] ?? [];
    rows.push({
      raceId,
      resolvedCount: effects.length,
      committedCount: textEffects.length,
      changed: summarizeEffects(effects) !== summarizeEffects(textEffects),
    });
  }

  return rows;
}

function printTraitReport(report) {
  console.log("\n=== TRAITS ===");
  console.log(`Total trait spells: ${report.total}`);
  console.log(`With plugin-mapped effects: ${report.withPluginEffects}`);
  console.log(`With text-parsed effects: ${report.withTextEffects}`);
  console.log(`Resolved via plugin (hybrid picked plugin): ${report.pluginWins}`);
  console.log(`Resolved via text fallback: ${report.textFallback}`);
  console.log(`Both empty: ${report.bothEmpty}`);
  console.log(`Plugin would add beyond text: ${report.pluginAddsBeyondText}`);
  console.log(`Text has effects plugin missed: ${report.textHasMore}`);

  const pluginSamples = report.rows.filter((row) => row.pluginCount > 0).slice(0, 15);
  console.log("\nSample traits WITH plugin effects:");
  for (const row of pluginSamples) {
    console.log(
      `  ${row.name} (${row.edid}): plugin=${row.pluginCount} text=${row.textCount} resolved=${row.resolvedCount} entries=${row.effectEntryCount}`,
    );
  }

  const missed = report.rows.filter((row) => row.textCount > 0 && row.pluginCount === 0).slice(0, 15);
  console.log("\nSample traits text-parsed but NO plugin effects (candidates for MGEF mapping expansion):");
  for (const row of missed) {
    console.log(`  ${row.name}: text=${row.textCount} entries=${row.effectEntryCount}`);
  }

  const pluginOnly = report.rows.filter((row) => row.pluginOnly.length > 0).slice(0, 10);
  if (pluginOnly.length > 0) {
    console.log("\nTraits where plugin adds effects text missed:");
    for (const row of pluginOnly) {
      console.log(`  ${row.name}: plugin-only keys: ${row.pluginOnly.join(", ")}`);
    }
  }
}

function printBirthsignReport(rows) {
  console.log("\n=== BIRTHSIGNS ===");
  for (const row of rows) {
    console.log(
      `  ${row.name}: spell=${row.hasSpell} entries=${row.effectEntries} plugin=${row.pluginCount} text=${row.textCount} resolved=${row.resolvedCount}`,
    );
  }
}

function printRaceReport(rows) {
  console.log("\n=== RACE EFFECTS ===");
  const changed = rows.filter((row) => row.changed);
  console.log(`Races with changed effects vs committed: ${changed.length}/${rows.length}`);
  for (const row of rows) {
    const mark = row.changed ? "CHANGED" : "same";
    console.log(`  ${row.raceId}: resolved=${row.resolvedCount} committed=${row.committedCount} (${mark})`);
  }
}

function printMgefStats(context) {
  const mgef = context.scan.mgefRecords ?? [];
  const withArchetype = mgef.filter((record) => record.mgefArchetype != null);
  const spellsWithEntries = context.scan.spellRecords.filter(
    (record) => (record.effectEntries?.length ?? 0) > 0,
  );
  console.log("\n=== SCAN STATS ===");
  console.log(`MGEF records indexed: ${mgef.length}`);
  console.log(`MGEF with archetype data: ${withArchetype.length}`);
  console.log(`SPEL with effect entries: ${spellsWithEntries.length}`);
}

const options = parseImportArgs(process.argv.slice(2));
if (!options.installPath) {
  console.error("Usage: node tools/import/analyze-effects-coverage.mjs --install <path>");
  process.exit(1);
}

const install = discoverInstall(options.installPath);
const allPlugins =
  options.pluginLimit != null ? install.plugins.slice(0, options.pluginLimit) : install.plugins;
const { toScan: plugins } = await filterPluginsForImport(allPlugins, {
  rescanAll: options.rescanPlugins,
});
console.log(`Scanning ${plugins.length} plugins…`);
const context = await buildImportContext({ install, plugins });

printMgefStats(context);
const traitReport = await analyzeTraits(context);
printTraitReport(traitReport);
printBirthsignReport(analyzeBirthsigns(context));
printRaceReport(analyzeRaces(context));
