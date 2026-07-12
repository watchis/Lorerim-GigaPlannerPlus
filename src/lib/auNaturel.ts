import type { BuildState } from "@/engine/buildEngine";

export const AU_NATUREL_TRAIT_ID = "au-naturel";
export const AU_NATUREL_GEAR_OPTION_ID = "au-naturel-gear";
export const AU_NATUREL_ARMOR_SLOTS = 4;
export const AU_NATUREL_GEAR_PENALTY_PER_PIECE = 40;

export function hasAuNaturelTrait(state: BuildState): boolean {
  return state.traitIds.includes(AU_NATUREL_TRAIT_ID);
}

export function parseAuNaturelGearPieces(choiceId: string): number | null {
  const value = Number.parseInt(choiceId, 10);
  if (!Number.isFinite(value) || value < 0 || value > AU_NATUREL_ARMOR_SLOTS) {
    return null;
  }
  return value;
}

export function getAuNaturelEmptyArmorSlots(gearPieces: number): number {
  return Math.max(0, AU_NATUREL_ARMOR_SLOTS - gearPieces);
}

export function getAuNaturelPerLevelAttributeBonus(
  gearPieces: number,
  playerLevel: number,
): number {
  return getAuNaturelEmptyArmorSlots(gearPieces) * playerLevel;
}

export function getAuNaturelGearPenalty(gearPieces: number): number {
  return gearPieces * AU_NATUREL_GEAR_PENALTY_PER_PIECE;
}

export function getAuNaturelTotalAttributeBonus(
  gearPieces: number,
  playerLevel: number,
): number {
  return (
    getAuNaturelPerLevelAttributeBonus(gearPieces, playerLevel) -
    getAuNaturelGearPenalty(gearPieces)
  );
}
