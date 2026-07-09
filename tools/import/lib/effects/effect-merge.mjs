/**
 * @param {import('../../../../src/data/schemas/index.ts').Effect} effect
 */
export function effectDedupeKey(effect) {
  if (effect.type === "skillPointsPerLevel") return "skillPointsPerLevel";
  if (effect.type === "perkPoints") return "perkPoints";
  if (effect.type === "traitSlot") return "traitSlot";
  return `${effect.type}:${effect.stat ?? ""}`;
}

/**
 * @param {import('../../../../src/data/schemas/index.ts').Effect[]} effects
 */
export function dedupePluginEffects(effects) {
  const byKey = new Map();
  for (const effect of effects) {
    byKey.set(effectDedupeKey(effect), effect);
  }
  return [...byKey.values()];
}

/**
 * Text-parsed effects are the baseline; plugin effects only fill stats text did not map.
 *
 * @param {import('../../../../src/data/schemas/index.ts').Effect[]} textEffects
 * @param {import('../../../../src/data/schemas/index.ts').Effect[]} pluginEffects
 */
export function mergeHybridEffects(textEffects, pluginEffects) {
  const dedupedPlugin = dedupePluginEffects(pluginEffects);
  if (dedupedPlugin.length === 0) return textEffects;
  if (textEffects.length === 0) return dedupedPlugin;

  const merged = new Map();
  for (const effect of textEffects) {
    merged.set(effectDedupeKey(effect), { ...effect });
  }
  for (const effect of dedupedPlugin) {
    const key = effectDedupeKey(effect);
    if (!merged.has(key)) {
      merged.set(key, { ...effect });
    }
  }
  return [...merged.values()];
}
