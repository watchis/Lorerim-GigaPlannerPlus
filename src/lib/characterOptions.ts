import type {
  AttributeStat,
  CharacterOption,
  CharacterOptionChoice,
  Effect,
  GameData,
  Mechanics,
} from "@/data/schemas";
import type { BuildState } from "@/engine/buildEngine";

interface MechanicsRewardProfile {
  perkPoints: number;
  attributeBonus: [number, number, number];
}

function getMechanicsRewardProfile(
  mechanics: Mechanics,
  binding: NonNullable<CharacterOption["mechanicsBinding"]>,
): MechanicsRewardProfile {
  return mechanics[binding];
}

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
  const legacyOghmaIds = ["none", "health", "magicka", "stamina"] as const;

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

    if (
      option.grantsTraitSlot &&
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

export function collectCharacterOptionEffects(
  game: GameData,
  state: BuildState,
): Effect[] {
  const effects: Effect[] = [];

  for (const option of game.characterOptions) {
    const choice = getSelectedCharacterOptionChoice(option, state.characterOptionChoices);
    if (choice.id === option.defaultChoice) continue;
    if (choice.effects) effects.push(...choice.effects);
  }

  return effects;
}

export function getCharacterOptionPerkPointBonus(game: GameData, state: BuildState): number {
  let total = 0;

  for (const option of game.characterOptions) {
    const choice = getSelectedCharacterOptionChoice(option, state.characterOptionChoices);
    if (choice.id === option.defaultChoice || !option.mechanicsBinding) continue;

    total += getMechanicsRewardProfile(game.mechanics, option.mechanicsBinding).perkPoints;
  }

  return total;
}

export function getCharacterOptionAttributeBonus(
  game: GameData,
  state: BuildState,
  stat: AttributeStat,
): number {
  let total = 0;

  for (const option of game.characterOptions) {
    const choice = getSelectedCharacterOptionChoice(option, state.characterOptionChoices);
    if (choice.id === option.defaultChoice) continue;

    if (choice.effects) {
      for (const effect of choice.effects) {
        if (effect.type === "attribute" && effect.stat === stat) {
          total += effect.value;
        }
      }
    }

    if (
      option.mechanicsBinding &&
      choice.attributeStat === stat &&
      choice.attributeBonusIndex !== undefined
    ) {
      const profile = getMechanicsRewardProfile(game.mechanics, option.mechanicsBinding);
      total += profile.attributeBonus[choice.attributeBonusIndex] ?? 0;
    }
  }

  return total;
}

export function getCharacterOptionTraitSlotBonus(game: GameData, state: BuildState): number {
  let total = 0;

  for (const option of game.characterOptions) {
    if (!option.grantsTraitSlot) continue;
    const choice = getSelectedCharacterOptionChoice(option, state.characterOptionChoices);
    if (choice.id !== option.defaultChoice) total += 1;
  }

  return total;
}

export interface CharacterOptionSummaryLine {
  key: string;
  text: string;
}

function formatLabel(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, String(value)),
    template,
  );
}

export function getCharacterOptionSummaryLines(
  game: GameData,
  option: CharacterOption,
  choice: CharacterOptionChoice,
  labels: Record<string, string>,
  attributeLabels: Record<string, string>,
): CharacterOptionSummaryLine[] {
  if (choice.id === option.defaultChoice) return [];

  const lines: CharacterOptionSummaryLine[] = [];

  if (option.mechanicsBinding) {
    const profile = getMechanicsRewardProfile(game.mechanics, option.mechanicsBinding);

    if (profile.perkPoints > 0 && option.perkPointsSummaryLabel) {
      const template = labels[option.perkPointsSummaryLabel];
      if (template) {
        lines.push({
          key: `${option.id}-perk-points`,
          text: formatLabel(template, { count: profile.perkPoints }),
        });
      }
    }

    if (
      choice.attributeStat !== undefined &&
      choice.attributeBonusIndex !== undefined &&
      option.attributeBonusSummaryLabel
    ) {
      const bonus = profile.attributeBonus[choice.attributeBonusIndex] ?? 0;
      if (bonus > 0) {
        const template = labels[option.attributeBonusSummaryLabel];
        if (template) {
          lines.push({
            key: `${option.id}-attribute-bonus`,
            text: formatLabel(template, {
              count: bonus,
              attribute: attributeLabels[choice.attributeStat] ?? choice.attributeStat,
            }),
          });
        }
      }
    }
  }

  return lines;
}
