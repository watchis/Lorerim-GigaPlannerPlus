import type { GameData } from "@/data/schemas";
import type { BuildState } from "@/engine/buildEngine";

export interface BuildBonusEntry {
  source: string;
  text: string;
}

function hasDisplayText(value: string | undefined | null): value is string {
  const trimmed = value?.trim();
  return Boolean(trimmed && trimmed !== "-");
}

function pushEntry(entries: BuildBonusEntry[], source: string, text: string): void {
  if (!hasDisplayText(text)) return;
  entries.push({ source, text: text.trim() });
}

function getPerkById(game: GameData, perkId: string) {
  for (const tree of Object.values(game.perkTrees)) {
    const perk = tree.perks.find((entry) => entry.id === perkId);
    if (perk) return perk;
  }
  return undefined;
}

export function collectBuildBonuses(game: GameData, state: BuildState): BuildBonusEntry[] {
  const entries: BuildBonusEntry[] = [];

  const race =
    state.raceId && state.raceId !== "none"
      ? game.races.find((entry) => entry.id === state.raceId)
      : undefined;
  if (race) {
    for (const bonus of race.bonuses) {
      pushEntry(entries, race.name, bonus);
    }
  }

  const birthsign =
    state.birthsignId && state.birthsignId !== "none"
      ? game.birthsigns.find((entry) => entry.id === state.birthsignId)
      : undefined;
  if (birthsign) {
    pushEntry(entries, birthsign.name, birthsign.bonus);
  }

  const deity =
    state.deityId && state.deityId !== "none"
      ? game.deities.find((entry) => entry.id === state.deityId)
      : undefined;
  if (deity) {
    pushEntry(entries, `${deity.name} (Shrine)`, deity.shrine);
    pushEntry(entries, `${deity.name} (Follower)`, deity.follower);
    pushEntry(entries, `${deity.name} (Devotee)`, deity.devotee);
  }

  for (const traitId of state.traitIds) {
    const trait = game.traits.find((entry) => entry.id === traitId);
    if (!trait) continue;
    pushEntry(entries, trait.name, trait.bonus);
  }

  for (const perkId of state.selectedPerkIds) {
    const perk = getPerkById(game, perkId);
    if (!perk) continue;
    pushEntry(entries, perk.name, perk.description);
  }

  return entries;
}
