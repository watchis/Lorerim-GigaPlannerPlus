import { defineCharacterOption } from "@/extension-api";
import {
  formatLichPerSoulSummary,
  getLichPerSoulEffects,
  getLichPhylactery,
  getLichSoulCount,
  getLichThresholdEffects,
  getUnlockedLichThresholds,
} from "@/lib/lichPhylactery";
import { getLichForm, getLichRacialBonus } from "@/lib/supernatural";

export default defineCharacterOption({
  id: "supernatural-lich",
  getModifications({ choice, option, game, state }) {
    if (choice.id === option.defaultChoice) return [];

    const modifications = [];
    const form = getLichForm(game);
    if (form?.effects.length) {
      modifications.push({
        source: { labelKey: option.titleLabel },
        effects: form.effects,
      });
    }

    const phylactery = getLichPhylactery(game);
    const souls = getLichSoulCount(game, state);
    const perSoulEffects = getLichPerSoulEffects(phylactery, souls);
    if (perSoulEffects.length) {
      modifications.push({
        source: { name: "Phylactery souls" },
        effects: perSoulEffects,
      });
    }

    const thresholdEffects = getLichThresholdEffects(phylactery, souls);
    if (thresholdEffects.length) {
      modifications.push({
        source: { name: "Phylactery thresholds" },
        effects: thresholdEffects,
      });
    }

    const racialBonus = getLichRacialBonus(game, state);
    if (racialBonus?.effects?.length) {
      modifications.push({
        source: { name: racialBonus.name },
        effects: racialBonus.effects,
      });
    }

    return modifications;
  },
  getSummaryLines({ choice, option, game, state, labels }) {
    if (choice.id === option.defaultChoice) return [];

    const lines: { key: string; text: string }[] = [];
    const phylactery = getLichPhylactery(game);
    const souls = getLichSoulCount(game, state);
    const soulsTemplate = labels.lichSoulsSummary ?? "{count} / {max} phylactery souls";
    lines.push({
      key: `${option.id}-souls`,
      text: soulsTemplate.replace("{count}", String(souls)).replace("{max}", String(phylactery.maxSouls)),
    });

    for (const [index, text] of formatLichPerSoulSummary(phylactery, souls).entries()) {
      lines.push({
        key: `${option.id}-per-soul-${index}`,
        text,
      });
    }

    for (const threshold of getUnlockedLichThresholds(phylactery, souls)) {
      lines.push({
        key: `${option.id}-threshold-${threshold.souls}`,
        text: threshold.name,
      });
    }

    const racialBonus = getLichRacialBonus(game, state);
    if (racialBonus) {
      lines.push({
        key: `${option.id}-racial`,
        text: racialBonus.name,
      });
    }

    return lines;
  },
});
