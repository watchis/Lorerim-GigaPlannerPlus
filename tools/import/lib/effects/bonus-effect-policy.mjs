import { extractConditionalBonusDetails, parseBonusEffects } from "../parse-bonus-effects.mjs";

/**
 * Plugin-derived effects are only used when bonus prose has no mapped unconditional
 * stats and the bonus is not conditional-only (e.g. "When standing still…").
 *
 * @param {string} bonusText
 * @param {import('../../../../src/data/schemas/index.ts').Effect[]} [textEffects]
 */
export function shouldUsePluginEffects(bonusText, textEffects = parseBonusEffects(bonusText)) {
  if (textEffects.length > 0) return false;

  const text = String(bonusText ?? "").trim();
  if (!text) return true;

  const conditionalDetails = extractConditionalBonusDetails(text, textEffects);
  return conditionalDetails.length === 0;
}
