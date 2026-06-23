import type { GameData } from "@/data/schemas";
import type { BuildState } from "@/engine/buildEngine";
import { extractConditionalBonusDetails } from "@/lib/resolveOptionEffects";
import { trimBonusClauses } from "@/lib/trimBonusClause";

export { extractConditionalBonusDetails };

export interface ConditionalBonusEntry {
  source: string;
  text: string;
}

export function collectConditionalBonuses(
  game: GameData,
  state: BuildState,
): ConditionalBonusEntry[] {
  const entries: ConditionalBonusEntry[] = [];

  const birthsign =
    state.birthsignId && state.birthsignId !== "none"
      ? game.birthsigns.find((entry) => entry.id === state.birthsignId)
      : undefined;
  if (birthsign) {
    const details =
      birthsign.bonusDetails ??
      extractConditionalBonusDetails(birthsign.bonus, birthsign.effects);
    for (const text of details) {
      for (const trimmed of trimBonusClauses(text)) {
        entries.push({ source: birthsign.name, text: trimmed });
      }
    }
  }

  for (const traitId of state.traitIds) {
    const trait = game.traits.find((entry) => entry.id === traitId);
    if (!trait) continue;
    const details =
      trait.bonusDetails ?? extractConditionalBonusDetails(trait.bonus, trait.effects);
    for (const text of details) {
      for (const trimmed of trimBonusClauses(text)) {
        entries.push({ source: trait.name, text: trimmed });
      }
    }
  }

  return entries;
}
