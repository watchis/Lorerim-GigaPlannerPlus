import type { Birthsign, Deity, Effect, Perk, Race, Trait } from "@/data/schemas";
import {
  extractConditionalBonusDetails,
  mergeEffects,
  parseBonusEffects,
} from "@/lib/resolveOptionEffects";

export function enrichRaceEffects(race: Race): Effect[] {
  return mergeEffects(...race.bonuses.map((bonus) => parseBonusEffects(bonus)));
}

export function enrichTrait(trait: Trait): Trait {
  const effects = parseBonusEffects(trait.bonus);
  return {
    ...trait,
    effects,
    bonusDetails: extractConditionalBonusDetails(trait.bonus, effects),
  };
}

export function enrichBirthsign(birthsign: Birthsign): Birthsign {
  const effects = parseBonusEffects(birthsign.bonus);
  return {
    ...birthsign,
    effects,
    bonusDetails: extractConditionalBonusDetails(birthsign.bonus, effects),
  };
}

export function enrichDeity(deity: Deity): Deity {
  return { ...deity, effects: parseBonusEffects(deity.shrine) };
}

export function enrichPerk(perk: Perk): Perk {
  return { ...perk, effects: parseBonusEffects(perk.description) };
}
