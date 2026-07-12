import { defineCharacterOption } from "@/extension-api";
import type { Attributes } from "@/engine/buildEngine";
import {
  getAuNaturelGearPenalty,
  getAuNaturelPerLevelAttributeBonus,
  getAuNaturelTotalAttributeBonus,
  hasAuNaturelTrait,
  parseAuNaturelGearPieces,
} from "@/lib/auNaturel";

const ATTRIBUTE_STATS: (keyof Attributes)[] = ["health", "magicka", "stamina"];

export default defineCharacterOption({
  id: "au-naturel",
  getModifications({ choice, state }) {
    if (!hasAuNaturelTrait(state)) return [];

    const gearPieces = parseAuNaturelGearPieces(choice.id);
    if (gearPieces === null) return [];

    const total = getAuNaturelTotalAttributeBonus(gearPieces, state.playerLevel);

    return [
      {
        source: { name: "Au Naturel" },
        effects: ATTRIBUTE_STATS.map((stat) => ({
          type: "attribute" as const,
          stat,
          value: total,
        })),
      },
    ];
  },
  getSummaryLines({ choice, option, labels, state }) {
    if (!hasAuNaturelTrait(state)) return [];

    const gearPieces = parseAuNaturelGearPieces(choice.id);
    if (gearPieces === null) return [];

    const perLevel = getAuNaturelPerLevelAttributeBonus(gearPieces, state.playerLevel);
    const penalty = getAuNaturelGearPenalty(gearPieces);
    const lines = [];

    const perLevelTemplate = labels.auNaturelPerLevelBonus;
    if (perLevelTemplate && perLevel > 0) {
      lines.push({
        key: `${option.id}-per-level`,
        text: perLevelTemplate.replace("{count}", String(perLevel)),
      });
    }

    const penaltyTemplate = labels.auNaturelGearPenalty;
    if (penaltyTemplate && penalty > 0) {
      lines.push({
        key: `${option.id}-penalty`,
        text: penaltyTemplate.replace("{count}", String(penalty)),
      });
    }

    return lines;
  },
});
