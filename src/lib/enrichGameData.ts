import type { Birthsign, Deity, Effect, Perk, Race, Trait } from "@/data/schemas";
import {
  extractConditionalBonusDetails,
  mergeEffects,
  parseBonusEffects,
  resolveBonusEffects,
} from "@/lib/resolveOptionEffects";

export function enrichRaceEffects(race: Race): Effect[] {
  return mergeEffects(...race.bonuses.map((bonus) => parseBonusEffects(bonus)));
}

export function enrichTrait(trait: Trait): Trait {
  const effects = resolveBonusEffects(trait.bonus, trait.effects);
  return {
    ...trait,
    effects,
    bonusDetails: extractConditionalBonusDetails(trait.bonus, effects),
  };
}

export function enrichBirthsign(birthsign: Birthsign): Birthsign {
  const effects = resolveBonusEffects(birthsign.bonus, birthsign.effects);
  return {
    ...birthsign,
    effects,
    bonusDetails: extractConditionalBonusDetails(birthsign.bonus, effects),
  };
}

export function enrichDeity(deity: Deity): Deity {
  return { ...deity, effects: resolveBonusEffects(deity.shrine, deity.effects) };
}

export function enrichPerk(perk: Perk): Perk {
  if (perk.extension) {
    return { ...perk, effects: perk.effects ?? [] };
  }
  return { ...perk, effects: resolveBonusEffects(perk.description, perk.effects) };
}
