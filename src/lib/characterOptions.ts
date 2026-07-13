import type {
  CharacterOption,
  CharacterOptionChoice,
  GameData,
} from "@/data/schemas";
import type { CharacterOptionSummaryLine } from "@/extension-api";
import { getCharacterOptionExtension } from "@/extensions/loadExtensions";
import type { BuildState } from "@/engine/buildEngine";

import { LEGACY_OGHMA_CHOICE_MAP } from "@/lib/oghmaLegacyChoices";
import { LICH_OPTION_ID, SUPERNATURAL_CLAIMED_CHOICE } from "@/lib/supernatural";

export function getSelectedCharacterOptionChoice(
  option: CharacterOption,
  choices: Record<string, string>,
): CharacterOptionChoice {
  const selectedId = choices[option.id] ?? option.defaultChoice;
  return (
    option.choices.find((choice) => choice.id === selectedId) ??
    option.choices.find((choice) => choice.id === option.defaultChoice)!
  );
}

export function normalizeCharacterOptionChoices(
  game: GameData,
  choices: Record<string, string> | undefined,
  legacyOghmaChoice?: number,
): Record<string, string> {
  const normalized: Record<string, string> = {};
  const legacyOghmaIds = ["none", "warrior", "mage", "thief"] as const;

  for (const option of game.characterOptions) {
    let selected = choices?.[option.id];

    if (
      selected === undefined &&
      option.id === "oghma-infinium" &&
      legacyOghmaChoice !== undefined &&
      legacyOghmaChoice >= 0 &&
      legacyOghmaChoice < legacyOghmaIds.length
    ) {
      selected = legacyOghmaIds[legacyOghmaChoice];
    }

    if (selected && LEGACY_OGHMA_CHOICE_MAP[selected]) {
      selected = LEGACY_OGHMA_CHOICE_MAP[selected];
    }

    if (option.id === LICH_OPTION_ID && selected === SUPERNATURAL_CLAIMED_CHOICE) {
      selected = "0";
    }

    if (
      option.controlType === "toggle" &&
      selected !== undefined &&
      selected !== option.defaultChoice &&
      selected !== "claimed"
    ) {
      selected = "claimed";
    }

    const valid = option.choices.some((choice) => choice.id === selected);
    normalized[option.id] = valid ? selected! : option.defaultChoice;
  }

  return normalized;
}

export type { CharacterOptionSummaryLine };

export function getCharacterOptionSummaryLines(
  game: GameData,
  option: CharacterOption,
  choice: CharacterOptionChoice,
  labels: Record<string, string>,
  _attributeLabels: Record<string, string>,
  state: BuildState,
): CharacterOptionSummaryLine[] {
  if (option.extension) {
    const extension = getCharacterOptionExtension(option.extension);
    if (extension?.getSummaryLines) {
      return extension.getSummaryLines({
        game,
        state,
        option,
        choice,
        labels,
      });
    }
  }

  if (choice.id === option.defaultChoice) return [];

  const lines: CharacterOptionSummaryLine[] = [];
  if (choice.effects) {
    for (const effect of choice.effects) {
      if (effect.type === "traitSlot" && effect.value > 0) {
        lines.push({
          key: `${option.id}-trait-slot`,
          text: labels.traitSlotReward ?? "+1 trait slot",
        });
      }
      if (effect.type === "perkPoints" && effect.value > 0) {
        const template = labels.oghmaPerkPoints ?? "+{count} perk points";
        lines.push({
          key: `${option.id}-perk-points`,
          text: template.replace("{count}", String(effect.value)),
        });
      }
    }
  }

  return lines;
}
