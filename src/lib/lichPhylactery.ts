import type { Effect, GameData, LichPhylactery, LichPhylacteryThreshold } from "@/data/schemas";
import type { BuildState } from "@/engine/buildEngine";

/** Same id as `LICH_OPTION_ID` — kept local to avoid a circular import with supernatural.ts. */
const LICH_OPTION_ID = "lich";
const LEGACY_CLAIMED_CHOICE = "claimed";

export const LICH_MAGICKA_FLOOD_SOULS = 1;
export const LICH_BARRIER_SOULS = 2;

export const DEFAULT_LICH_SOULS = 0;

export function getLichPhylactery(game: GameData): LichPhylactery {
  return game.supernatural.lichdom.phylactery;
}

export function parseLichSoulCount(choiceId: string, maxSouls: number): number | null {
  if (choiceId === LEGACY_CLAIMED_CHOICE) return DEFAULT_LICH_SOULS;
  const value = Number.parseInt(choiceId, 10);
  if (!Number.isFinite(value) || value < 0 || value > maxSouls) return null;
  return value;
}

export function getLichSoulCount(game: GameData, state: BuildState): number {
  const maxSouls = getLichPhylactery(game).maxSouls;
  const choiceId = state.characterOptionChoices[LICH_OPTION_ID] ?? "none";
  return parseLichSoulCount(choiceId, maxSouls) ?? DEFAULT_LICH_SOULS;
}

export function lichSoulChoiceId(souls: number): string {
  return String(souls);
}

export function isLichSoulChoiceId(choiceId: string, maxSouls: number): boolean {
  return parseLichSoulCount(choiceId, maxSouls) !== null;
}

export function getUnlockedLichThresholds(
  phylactery: LichPhylactery,
  souls: number,
): LichPhylacteryThreshold[] {
  return phylactery.thresholds.filter((threshold) => threshold.souls <= souls);
}

export function getNextLichThreshold(
  phylactery: LichPhylactery,
  souls: number,
): LichPhylacteryThreshold | undefined {
  return phylactery.thresholds.find((threshold) => threshold.souls > souls);
}

/**
 * Continuous stacking from Magicka Flood (1+) and Lich Barrier (2+).
 * Magicka Flood's base +50 is on the soul-1 threshold, matching `50 + 4 * souls`.
 */
export function getLichPerSoulEffects(phylactery: LichPhylactery, souls: number): Effect[] {
  if (souls < LICH_MAGICKA_FLOOD_SOULS) return [];

  const { armorRating, magicka, magicAbsorb } = phylactery.perSoul;
  const effects: Effect[] = [
    {
      type: "attribute",
      stat: "magicka",
      value: magicka * souls,
    },
  ];

  if (souls >= LICH_BARRIER_SOULS) {
    effects.unshift({
      type: "derivedStat",
      stat: "armorRating",
      value: armorRating * souls,
    });
    effects.push({
      type: "derivedStat",
      stat: "magicAbsorb",
      value: magicAbsorb * souls,
      isPercent: true,
    });
  }

  return effects;
}

export function getLichThresholdEffects(
  phylactery: LichPhylactery,
  souls: number,
): Effect[] {
  return getUnlockedLichThresholds(phylactery, souls).flatMap(
    (threshold) => threshold.effects ?? [],
  );
}

export function formatLichPhylacteryNextUnlockSubtitle(
  phylactery: LichPhylactery,
  souls: number,
  template = "Next unlock at {count} souls: {name}",
): string | null {
  const next = getNextLichThreshold(phylactery, souls);
  if (!next) return null;

  return template.replace("{count}", String(next.souls)).replace("{name}", next.name);
}

export function formatLichPerSoulSummary(phylactery: LichPhylactery, souls: number): string[] {
  if (souls < LICH_MAGICKA_FLOOD_SOULS) return [];

  const { armorRating, magicka, magicAbsorb, magicAbsorbInForm, spellDurationInForm } =
    phylactery.perSoul;
  const lines: string[] = [
    `+${magicka * souls} magicka`,
    `+${formatPercent(spellDurationInForm * souls)} spell duration in lich form`,
  ];

  if (souls >= LICH_BARRIER_SOULS) {
    lines.push(
      `+${armorRating * souls} armor rating`,
      `+${formatPercent(magicAbsorb * souls)} magic absorb chance`,
      `+${formatPercent(magicAbsorbInForm * souls)} magic absorb chance in lich form`,
    );
  }

  return lines;
}

function formatPercent(value: number): string {
  const rounded = Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
  return `${rounded}%`;
}
