import { defineCharacterOption } from "@/extension-api";

const PERK_POINT_BONUS = 3;
const SKILL_LEVEL_BONUS = 5;

const PATH_SKILLS: Record<string, string[]> = {
  warrior: ["one-handed", "two-handed", "block", "heavy-armor", "smithing", "enchanting"],
  mage: [
    "destruction",
    "conjuration",
    "alteration",
    "illusion",
    "restoration",
    "enchanting",
  ],
  thief: ["sneak", "evasion", "finesse", "wayfarer", "speech", "alchemy"],
  health: ["one-handed", "two-handed", "block", "heavy-armor", "smithing", "enchanting"],
  magicka: [
    "destruction",
    "conjuration",
    "alteration",
    "illusion",
    "restoration",
    "enchanting",
  ],
  stamina: ["sneak", "evasion", "finesse", "wayfarer", "speech", "alchemy"],
};

export default defineCharacterOption({
  id: "oghma-infinium",
  getModifications({ choice, option }) {
    if (choice.id === option.defaultChoice) return [];

    const skills = PATH_SKILLS[choice.id] ?? [];
    return [
      {
        source: { labelKey: option.titleLabel },
        effects: [{ type: "perkPoints", value: PERK_POINT_BONUS }],
        skillLevelGrants: skills.map((skillId) => ({
          skillId,
          bonus: SKILL_LEVEL_BONUS,
          bypassPlayerLevelCap: true,
          bypassSkillIncreaseLimit: true,
        })),
      },
    ];
  },
  getSummaryLines({ choice, option, labels }) {
    if (choice.id === option.defaultChoice) return [];

    const lines = [];
    const perkTemplate = labels.oghmaPerkPoints;
    if (perkTemplate) {
      lines.push({
        key: `${option.id}-perk-points`,
        text: perkTemplate.replace("{count}", String(PERK_POINT_BONUS)),
      });
    }

    const skillTemplate = labels.oghmaSkillLevels;
    if (skillTemplate) {
      lines.push({
        key: `${option.id}-skill-levels`,
        text: skillTemplate.replace("{count}", String(SKILL_LEVEL_BONUS)),
      });
    }

    return lines;
  },
});
