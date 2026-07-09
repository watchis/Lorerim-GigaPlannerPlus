import { defineCharacterOption } from "@/extension-api";
import {
  getVampireForm,
  getVampireRacialBonus,
} from "@/lib/supernatural";

export default defineCharacterOption({
  id: "supernatural-vampire",
  getModifications({ choice, option, game, state }) {
    if (choice.id === option.defaultChoice) return [];

    const modifications = [];
    const form = getVampireForm(game);
    if (form?.effects.length) {
      modifications.push({
        source: { labelKey: option.titleLabel },
        effects: form.effects,
      });
    }

    const racialBonus = getVampireRacialBonus(game, state);
    if (racialBonus?.effects?.length) {
      modifications.push({
        source: { name: racialBonus.name },
        effects: racialBonus.effects,
      });
    }

    return modifications;
  },
  getSummaryLines({ choice, option, game, state }) {
    if (choice.id === option.defaultChoice) return [];

    const racialBonus = getVampireRacialBonus(game, state);
    if (!racialBonus) return [];

    return [
      {
        key: `${option.id}-racial`,
        text: racialBonus.name,
      },
    ];
  },
});
