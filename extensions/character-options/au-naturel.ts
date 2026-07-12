import { defineCharacterOption } from "@/extension-api";
import type { Attributes } from "@/engine/buildEngine";
import {
  getAuNaturelPerLevelAttributeBonus,
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

    const bonus = getAuNaturelPerLevelAttributeBonus(gearPieces, state.playerLevel);
    if (bonus <= 0) return [];

    return [
      {
        source: { name: "Au Naturel" },
        effects: ATTRIBUTE_STATS.map((stat) => ({
          type: "attribute" as const,
          stat,
          value: bonus,
        })),
      },
    ];
  },
  getSummaryLines({ choice, option, labels, state }) {
    if (!hasAuNaturelTrait(state)) return [];

    const gearPieces = parseAuNaturelGearPieces(choice.id);
    if (gearPieces === null) return [];

    const bonus = getAuNaturelPerLevelAttributeBonus(gearPieces, state.playerLevel);
    if (bonus <= 0) return [];

    const template = labels.auNaturelPerLevelBonus;
    if (!template) return [];

    const emptySlots = 4 - gearPieces;
    return [
      {
        key: `${option.id}-per-level`,
        text: template
          .replace("{count}", String(bonus))
          .replace("{emptySlots}", String(emptySlots))
          .replace("{level}", String(state.playerLevel)),
      },
    ];
  },
});
