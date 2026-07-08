import { definePerk, scaleDerivedStatBySkillLevel } from "@/extension-api";

const PERCENT_PER_SPEECH_LEVEL = 1;

export default definePerk({
  id: "speech-haggling",
  getModifications({ perk, skillLevel, isSelected }) {
    if (!isSelected) return [];

    return [
      {
        source: { name: perk.name },
        effects: [
          scaleDerivedStatBySkillLevel("priceModifier", skillLevel, PERCENT_PER_SPEECH_LEVEL, {
            isPercent: true,
          }),
        ],
      },
    ];
  },
});
