import { defineCharacterOption } from "@/extension-api";
import {
  getActiveVampireStage,
  getVampireRacialBonus,
} from "@/lib/supernatural";

export default defineCharacterOption({
  id: "supernatural-vampire",
  getModifications({ choice, option, game, state }) {
    if (choice.id === option.defaultChoice) return [];

    const modifications = [];
    const stage = getActiveVampireStage(game, state);
    if (stage?.effects.length) {
      modifications.push({
        source: { labelKey: option.titleLabel },
        effects: stage.effects,
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

    const lines: { key: string; text: string }[] = [];
    const stage = getActiveVampireStage(game, state);
    if (stage) {
      lines.push({
        key: `${option.id}-stage`,
        text: stage.name,
      });
    }

    const racialBonus = getVampireRacialBonus(game, state);
    if (racialBonus) {
      lines.push({
        key: `${option.id}-racial`,
        text: racialBonus.name,
      });
    }

    return lines;
  },
});
