import { parseBonusEffects } from "../parse-bonus-effects.mjs";
import { mergeHybridEffects } from "./effect-merge.mjs";
import { spellRecordsToEffects } from "./spell-to-effects.mjs";

export { dedupePluginEffects, effectDedupeKey, mergeHybridEffects } from "./effect-merge.mjs";

/**
 * Hybrid resolver: text parsing for mapped bonus prose, plugin effects for extra structured stats.
 *
 * @param {object} params
 * @param {string} [params.bonusText]
 * @param {Array} [params.spellRecords] One or more linked ability spells
 * @param {{ byIdentity: Map }} params.mgefIndex
 * @param {Map<string, string[]>} [params.mastersByPath]
 * @param {Array<{ pluginName: string, path: string }>} [params.plugins]
 */
export function resolveEffects({
  bonusText = "",
  spellRecords = [],
  mgefIndex,
  mastersByPath = new Map(),
  plugins = [],
}) {
  const spells = Array.isArray(spellRecords) ? spellRecords : spellRecords ? [spellRecords] : [];
  const fromPlugins = spellRecordsToEffects(spells, mgefIndex, mastersByPath, plugins);
  const fromText = parseBonusEffects(bonusText);
  return mergeHybridEffects(fromText, fromPlugins);
}

/**
 * Merge plugin-derived effects from ability spells with text-parsed race/birthsign bonuses.
 */
export function resolveEffectsFromSpells(spells, bonusText, mgefIndex, mastersByPath, plugins) {
  const fromPlugins = spellRecordsToEffects(spells, mgefIndex, mastersByPath, plugins);
  const fromText = parseBonusEffects(bonusText);
  return mergeHybridEffects(fromText, fromPlugins);
}

/**
 * @deprecated Use resolveEffects instead.
 */
export function mergePluginAndTextEffects(params) {
  return resolveEffects(params);
}
