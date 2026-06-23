import type { Effect } from "@/data/schemas";
import { extractConditionalBonusDetails } from "@/lib/conditionalBonuses";
import { trimBonusClauses } from "@/lib/trimBonusClause";

export interface OptionWithBonus {
  bonus?: string;
  bonusDetails?: string[];
  effects?: Effect[];
}

export function resolveOptionBonusDetails(option: OptionWithBonus): string[] {
  const details = option.bonusDetails?.length
    ? option.bonusDetails
    : option.bonus?.trim()
      ? extractConditionalBonusDetails(option.bonus, option.effects ?? [])
      : [];

  return details.flatMap((detail: string) => trimBonusClauses(detail));
}
