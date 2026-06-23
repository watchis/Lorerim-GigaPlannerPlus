import type { Effect } from "@/data/schemas";
import {
  extractConditionalBonusDetails,
  mergeEffects,
  parseBonusEffects,
  resolveBonusEffects,
} from "@/lib/parseBonusEffects.mjs";

export {
  extractConditionalBonusDetails,
  mergeEffects,
  parseBonusEffects,
  resolveBonusEffects,
};

export function resolveEffectsFromTexts(
  texts: string[],
  priorEffects: Effect[] = [],
): Effect[] {
  if (priorEffects.length > 0) return priorEffects;

  const parsed: Effect[] = [];
  for (const text of texts) {
    const trimmed = text.trim();
    if (!trimmed || trimmed === "-") continue;
    parsed.push(...parseBonusEffects(trimmed));
  }

  return mergeEffects(parsed);
}
