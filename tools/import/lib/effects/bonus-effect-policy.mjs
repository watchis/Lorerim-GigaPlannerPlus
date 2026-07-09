import { parseBonusEffects } from "../parse-bonus-effects.mjs";

/**
 * Plugin-derived effects fill gaps when bonus prose did not map to any text-parsed stats.
 *
 * @param {string} bonusText
 * @param {import('../../../../src/data/schemas/index.ts').Effect[]} [textEffects]
 */
export function shouldUsePluginEffects(bonusText, textEffects = parseBonusEffects(bonusText)) {
  return textEffects.length === 0;
}
