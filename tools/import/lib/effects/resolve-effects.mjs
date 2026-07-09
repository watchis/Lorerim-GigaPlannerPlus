import { mergeEffects, parseBonusEffects } from "../parse-bonus-effects.mjs";
import { spellRecordsToEffects } from "./spell-to-effects.mjs";

/**
 * Hybrid resolver: structured plugin effects when available, text parsing as fallback.
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

  if (fromPlugins.length > 0) {
    return fromPlugins;
  }

  return parseBonusEffects(bonusText);
}

/**
 * Merge plugin-derived effects from multiple spells, then fall back to bonus text.
 */
export function resolveEffectsFromSpells(spells, bonusText, mgefIndex, mastersByPath, plugins) {
  const fromPlugins = spellRecordsToEffects(spells, mgefIndex, mastersByPath, plugins);
  if (fromPlugins.length > 0) {
    return fromPlugins;
  }
  return parseBonusEffects(bonusText);
}

/**
 * Combine plugin effects with text-parsed effects (deduped).
 */
export function mergePluginAndTextEffects({
  bonusText = "",
  spellRecords = [],
  mgefIndex,
  mastersByPath = new Map(),
  plugins = [],
}) {
  const spells = Array.isArray(spellRecords) ? spellRecords : spellRecords ? [spellRecords] : [];
  const fromPlugins = spellRecordsToEffects(spells, mgefIndex, mastersByPath, plugins);
  const fromText = parseBonusEffects(bonusText);
  return mergeEffects(fromPlugins, fromText);
}
