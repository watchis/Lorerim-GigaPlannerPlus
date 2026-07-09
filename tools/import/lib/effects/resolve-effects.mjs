import { parseBonusEffects } from "../parse-bonus-effects.mjs";
import { shouldUsePluginEffects } from "./bonus-effect-policy.mjs";
import { mergeHybridEffects } from "./effect-merge.mjs";
import { spellRecordsToEffects } from "./spell-to-effects.mjs";

export { shouldUsePluginEffects } from "./bonus-effect-policy.mjs";
export { dedupePluginEffects, effectDedupeKey, mergeHybridEffects } from "./effect-merge.mjs";

function resolveHybridEffects({ bonusText, spellRecords, mgefIndex, mastersByPath, plugins }) {
  const fromText = parseBonusEffects(bonusText);
  if (!shouldUsePluginEffects(bonusText, fromText)) {
    return fromText;
  }

  const spells = Array.isArray(spellRecords) ? spellRecords : spellRecords ? [spellRecords] : [];
  const fromPlugins = spellRecordsToEffects(spells, mgefIndex, mastersByPath, plugins);
  return mergeHybridEffects(fromText, fromPlugins);
}

/**
 * Hybrid resolver: text-parsed effects are authoritative when present; plugin effects fill gaps otherwise.
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
  return resolveHybridEffects({
    bonusText,
    spellRecords,
    mgefIndex,
    mastersByPath,
    plugins,
  });
}

/**
 * Merge plugin-derived effects from ability spells with text-parsed race/birthsign bonuses.
 */
export function resolveEffectsFromSpells(spells, bonusText, mgefIndex, mastersByPath, plugins) {
  return resolveHybridEffects({
    bonusText,
    spellRecords: spells,
    mgefIndex,
    mastersByPath,
    plugins,
  });
}

/**
 * @deprecated Use resolveEffects instead.
 */
export function mergePluginAndTextEffects(params) {
  return resolveEffects(params);
}
