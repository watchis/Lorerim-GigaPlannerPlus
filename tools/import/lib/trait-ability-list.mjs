import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import * as tesData from "@fcrick/tes-data";
import { open } from "node:fs/promises";
import { parseMasters, resolveFormIdentity } from "./formid.mjs";
import { getRecordBufferAsync, visitAsync } from "./plugin-io.mjs";

export const TRAITS_ABILITY_LIST_EDID = "Traits_AbilityList";

const FLM_TRAIT_LIST_LINE = /^FormList\s*=\s*Traits_AbilityList\|(.+)$/i;

export function readFormIdsFromBuffer(buffer) {
  const ids = [];
  let index = 0;
  while ((index = buffer.indexOf("LNAM", index)) !== -1) {
    const size = buffer.readUInt16LE(index + 4);
    const data = buffer.subarray(index + 6, index + 6 + size);
    if (data.length >= 4) ids.push(data.readUInt32LE(0));
    index += 4;
  }
  return ids;
}

async function readPluginMasters(pluginPath) {
  const fh = await open(pluginPath, "r");
  const offsets = await visitAsync(fh.fd);
  const header = offsets.find(([, type]) => type === "TES4");
  if (!header) {
    await fh.close();
    return [];
  }
  const buffer = await getRecordBufferAsync(fh.fd, header[0]);
  await fh.close();
  return parseMasters(buffer);
}

async function readWinningFormListFormIds(plugins, formListEdid) {
  let formIds = [];

  for (const { path } of plugins) {
    const fh = await open(path, "r");
    const offsets = await visitAsync(fh.fd);

    for (const [offset, type] of offsets) {
      if (type !== "FLST") continue;
      const buffer = await getRecordBufferAsync(fh.fd, offset);
      const record = tesData.getRecord(buffer);
      if (record.compressed) continue;
      const edid = record.subRecords?.find((sub) => sub.type === "EDID")?.value;
      if (edid !== formListEdid) continue;
      formIds = readFormIdsFromBuffer(buffer);
    }

    await fh.close();
  }

  return formIds;
}

const mastersCache = new Map();

async function getPluginMasters(pluginPath, mastersByPath = null) {
  if (mastersByPath?.has(pluginPath)) {
    return mastersByPath.get(pluginPath);
  }
  if (!mastersCache.has(pluginPath)) {
    mastersCache.set(pluginPath, await readPluginMasters(pluginPath));
  }
  return mastersCache.get(pluginPath);
}

async function buildSpellIdentityIndexAsync(plugins, spellRecords, mastersByPath = null) {
  const pluginPathByName = new Map(
    plugins.map((plugin) => [plugin.pluginName.toLowerCase(), plugin.path]),
  );
  const index = new Map();

  for (const spell of spellRecords) {
    if (spell.formId == null) continue;
    const pluginName = String(spell.plugin ?? "").toLowerCase();
    const pluginPath = pluginPathByName.get(pluginName);
    if (!pluginPath) continue;

    const masters = await getPluginMasters(pluginPath, mastersByPath);
    const identity = resolveFormIdentity(pluginName, masters, spell.formId);
    index.set(identity, spell.edid);
  }

  return index;
}

async function resolveFormIdsToSpellEdids(plugins, formIds, spellRecords, options = {}) {
  if (formIds.length === 0) return [];

  let sourcePlugin = options.sourcePlugin ?? null;
  if (!sourcePlugin) {
    for (const plugin of plugins) {
      const fh = await open(plugin.path, "r");
      const offsets = await visitAsync(fh.fd);
      for (const [offset, type] of offsets) {
        if (type !== "FLST") continue;
        const buffer = await getRecordBufferAsync(fh.fd, offset);
        const record = tesData.getRecord(buffer);
        if (record.compressed) continue;
        const edid = record.subRecords?.find((sub) => sub.type === "EDID")?.value;
        if (edid === TRAITS_ABILITY_LIST_EDID) {
          sourcePlugin = plugin;
        }
      }
      await fh.close();
    }
  }

  if (!sourcePlugin) return [];

  const masters = await getPluginMasters(sourcePlugin.path, options.mastersByPath);
  const owner = sourcePlugin.pluginName.toLowerCase();
  const spellByIdentity = await buildSpellIdentityIndexAsync(
    plugins,
    spellRecords,
    options.mastersByPath,
  );
  const edids = [];

  for (const rawFormId of formIds) {
    const identity = resolveFormIdentity(owner, masters, rawFormId);
    const edid = spellByIdentity.get(identity);
    if (edid) edids.push(edid);
  }

  return edids;
}

export function parseFlmTraitAbilityAdditions(configText) {
  const additions = [];

  for (const line of configText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(";")) continue;
    const match = trimmed.match(FLM_TRAIT_LIST_LINE);
    if (match) additions.push(match[1].trim());
  }

  return additions;
}

export function collectFlmTraitAbilityAdditions(installDir, enabledMods) {
  const additions = [];

  for (const modName of enabledMods) {
    const modRoot = join(installDir, "mods", modName);
    if (!existsSync(modRoot)) continue;

    for (const entry of readdirSync(modRoot)) {
      if (!entry.endsWith("_FLM.ini")) continue;
      const configText = readFileSync(join(modRoot, entry), "utf8");
      additions.push(...parseFlmTraitAbilityAdditions(configText));
    }
  }

  return additions;
}

function dedupePreserveOrder(edids) {
  const seen = new Set();
  const result = [];

  for (const edid of edids) {
    if (!edid || seen.has(edid)) continue;
    seen.add(edid);
    result.push(edid);
  }

  return result;
}

/**
 * Resolve selectable trait ability spells from Traits_AbilityList (FLST + FLM patches).
 * @param {Array<{ pluginName: string, path: string }>} plugins
 * @param {string} installDir
 * @param {string[]} enabledMods
 * @param {Array<{ edid: string, name?: string, description?: string, plugin?: string, formId?: number }>} spellRecords
 */
export async function collectTraitAbilitySpells(
  plugins,
  installDir,
  enabledMods,
  spellRecords,
  options = {},
) {
  const spellByEdid = new Map(spellRecords.map((record) => [record.edid, record]));
  const traitScanOptions = {
    sourcePlugin: options.traitsFormList?.sourcePlugin ?? null,
    mastersByPath: options.mastersByPath ?? null,
  };
  const baseFormIds =
    options.traitsFormList?.formIds ??
    (await readWinningFormListFormIds(plugins, TRAITS_ABILITY_LIST_EDID));
  const baseEdids = await resolveFormIdsToSpellEdids(plugins, baseFormIds, spellRecords, traitScanOptions);
  const flmEdids = collectFlmTraitAbilityAdditions(installDir, enabledMods);
  const mergedEdids = dedupePreserveOrder([...baseEdids, ...flmEdids]);

  const spells = [];
  for (const edid of mergedEdids) {
    const spell = spellByEdid.get(edid);
    if (!spell?.name) continue;
    spells.push(spell);
  }

  return spells;
}
