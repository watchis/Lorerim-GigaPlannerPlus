import type { Effect, Mechanics } from "@/data/schemas";

function formatStatId(stat: string): string {
  return stat
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
}

function getStatLabel(stat: string, mechanics: Mechanics): string {
  const derived = mechanics.derivedStats.find((entry) => entry.id === stat);
  return derived?.label ?? formatStatId(stat);
}

export function formatSignedBonusValue(value: number, isPercent: boolean): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}${isPercent ? "%" : ""}`;
}

export function formatEffectBonus(effect: Effect, mechanics: Mechanics): string {
  if (effect.type === "attribute") {
    const label = effect.stat.charAt(0).toUpperCase() + effect.stat.slice(1);
    return `${label}: ${formatSignedBonusValue(effect.value, false)}`;
  }

  if (effect.type === "skillPointsPerLevel") {
    return `Skill points per level: ${formatSignedBonusValue(effect.value, false)}`;
  }

  if (effect.type === "flag") {
    const label = getStatLabel(effect.stat, mechanics);
    return label;
  }

  const derived = mechanics.derivedStats.find((entry) => entry.id === effect.stat);
  const label = getStatLabel(effect.stat, mechanics);
  const isPercent = effect.isPercent ?? derived?.isPercent ?? false;
  return `${label}: ${formatSignedBonusValue(effect.value, isPercent)}`;
}
