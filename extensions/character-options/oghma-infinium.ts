import { defineCharacterOption } from "@/extension-api";
import {
  getActiveOghmaSkillIds,
  getOghmaFreeSkillLevels,
  getOghmaPerkPointBonus,
  OGHMA_INFINIUM_CLAIMED_CHOICE,
} from "@/lib/oghmaInfinium";

export default defineCharacterOption({
  id: "oghma-infinium",
  getModifications({ choice, option, game, state }) {
    if (choice.id === option.defaultChoice) return [];

    const skillIds = getActiveOghmaSkillIds(state);
    const freeTopLevels = getOghmaFreeSkillLevels(game);

    return [
      {
        source: { labelKey: option.titleLabel },
        effects: [{ type: "perkPoints", value: getOghmaPerkPointBonus(game) }],
        skillLevelGrants: skillIds.map((skillId) => ({
          skillId,
          bonus: 0,
          freeTopLevels,
        })),
      },
    ];
  },
  getSummaryLines({ choice, option, labels, game, state }) {
    if (choice.id === option.defaultChoice) return [];

    const lines = [];
    const perkTemplate = labels.oghmaPerkPoints;
    const perkPoints = getOghmaPerkPointBonus(game);
    if (perkTemplate) {
      lines.push({
        key: `${option.id}-perk-points`,
        text: perkTemplate.replace("{count}", String(perkPoints)),
      });
    }

    const skillTemplate = labels.oghmaSkillLevels;
    const freeTopLevels = getOghmaFreeSkillLevels(game);
    const selectedCount = getActiveOghmaSkillIds(state).length;
    if (skillTemplate && selectedCount > 0) {
      lines.push({
        key: `${option.id}-skill-levels`,
        text: skillTemplate.replace("{count}", String(freeTopLevels)),
      });
    }

    return lines;
  },
});

export { OGHMA_INFINIUM_CLAIMED_CHOICE };
