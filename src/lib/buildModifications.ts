import type { Effect, GameData } from "@/data/schemas";
import type {
  BuildModification,
  CharacterOptionContext,
  SourcedSkillLevelGrant,
} from "@/extension-api";
import { getSelectedCharacterOptionChoice } from "@/lib/characterOptions";
import {
  getCharacterOptionExtension,
  getPerkExtension,
} from "@/extensions/loadExtensions";
import type { BuildState } from "@/engine/buildEngine";
import type { SourcedEffect } from "@/lib/trackedStats";
import {
  getLycanthropyForm,
  getVampirismStage,
  isLycanthropyActive,
  isVampirismActive,
} from "@/lib/supernatural";

function getPerkById(game: GameData, perkId: string) {
  for (const tree of Object.values(game.perkTrees)) {
    const perk = tree.perks.find((entry) => entry.id === perkId);
    if (perk) return perk;
  }
  return undefined;
}

function getPerkSkillId(game: GameData, perkId: string): string | null {
  for (const [skillId, tree] of Object.entries(game.perkTrees)) {
    if (tree.perks.some((perk) => perk.id === perkId)) return skillId;
  }
  return null;
}

function getStoredSkillLevel(game: GameData, state: BuildState, skillId: string): number {
  const race = state.raceId
    ? game.races.find((entry) => entry.id === state.raceId)
    : undefined;
  let floor = 0;
  for (const source of game.mechanics.leveling.skillFloorSources) {
    if (source.type === "raceStarting") {
      floor = Math.max(floor, race?.startingSkills[skillId] ?? 0);
      continue;
    }
    const selected =
      source.selection === "major" ? state.majorSkillIds : state.minorSkillIds;
    if (selected.includes(skillId)) {
      floor += game.mechanics[source.bonusField];
    }
  }
  const stored = state.skillLevels[skillId] ?? floor;
  const maxSkillLevel = game.mechanics.leveling.maxSkillLevel;
  return Math.min(maxSkillLevel, Math.max(floor, stored));
}

export interface CollectedBuildChanges {
  modifications: BuildModification[];
  sourcedEffects: SourcedEffect[];
  skillLevelGrants: SourcedSkillLevelGrant[];
  plannerNotesByPerkId: Map<string, string[]>;
}

function sourceName(mod: BuildModification): string {
  return mod.source.name ?? mod.source.labelKey ?? "unknown";
}

function pushModification(
  collected: CollectedBuildChanges,
  mod: BuildModification,
  perkId?: string,
): void {
  collected.modifications.push(mod);

  const name = sourceName(mod);
  const { labelKey } = mod.source;

  if (mod.effects) {
    for (const effect of mod.effects) {
      collected.sourcedEffects.push({
        source: name,
        labelKey,
        effect,
      });
    }
  }

  if (mod.skillLevelGrants) {
    for (const grant of mod.skillLevelGrants) {
      collected.skillLevelGrants.push({
        ...grant,
        source: mod.source,
      });
    }
  }

  if (perkId && mod.plannerNotes?.length) {
    const existing = collected.plannerNotesByPerkId.get(perkId) ?? [];
    collected.plannerNotesByPerkId.set(perkId, [...existing, ...mod.plannerNotes]);
  }
}

function resolveRace(game: GameData, raceId: string | null) {
  if (!raceId || raceId === "none") return undefined;
  return game.races.find((race) => race.id === raceId);
}

function collectCharacterOptionModifications(
  game: GameData,
  state: BuildState,
): BuildModification[] {
  const modifications: BuildModification[] = [];

  for (const option of game.characterOptions) {
    const choice = getSelectedCharacterOptionChoice(option, state.characterOptionChoices);
    if (choice.id === option.defaultChoice) continue;

    if (option.extension) {
      const extension = getCharacterOptionExtension(option.extension);
      if (!extension) continue;

      const ctx: CharacterOptionContext = {
        game,
        state,
        option,
        choice,
        labels: {},
      };
      modifications.push(...extension.getModifications(ctx));
      continue;
    }

    if (choice.effects?.length) {
      modifications.push({
        source: { name: option.titleLabel, labelKey: option.titleLabel },
        effects: choice.effects,
      });
    }
  }

  return modifications;
}

export function collectBuildChanges(game: GameData, state: BuildState): CollectedBuildChanges {
  const collected: CollectedBuildChanges = {
    modifications: [],
    sourcedEffects: [],
    skillLevelGrants: [],
    plannerNotesByPerkId: new Map(),
  };

  const race = resolveRace(game, state.raceId);
  if (race) {
    pushModification(collected, {
      source: { name: race.name },
      effects: race.effects,
    });
  }

  const birthsign = game.birthsigns.find((entry) => entry.id === state.birthsignId);
  if (birthsign) {
    pushModification(collected, {
      source: { name: birthsign.name },
      effects: birthsign.effects,
    });
  }

  const deity = game.deities.find((entry) => entry.id === state.deityId);
  if (deity) {
    pushModification(collected, {
      source: { name: deity.name },
      effects: deity.effects,
    });
  }

  for (const traitId of state.traitIds) {
    const trait = game.traits.find((entry) => entry.id === traitId);
    if (!trait) continue;
    pushModification(collected, {
      source: { name: trait.name },
      effects: trait.effects,
    });
  }

  if (isVampirismActive(state)) {
    const stage = getVampirismStage(game, state.vampirismId);
    if (stage && stage.effects.length > 0) {
      pushModification(collected, {
        source: { name: stage.name },
        effects: stage.effects,
      });
    }

    const raceId = state.raceId && state.raceId !== "none" ? state.raceId : null;
    const racialBonus = raceId ? game.supernatural.vampirism.racialBonuses[raceId] : undefined;
    if (racialBonus?.effects?.length) {
      pushModification(collected, {
        source: { name: racialBonus.name },
        effects: racialBonus.effects,
      });
    }
  }

  if (isLycanthropyActive(state)) {
    const form = getLycanthropyForm(game, state.lycanthropyId);
    if (form && form.effects.length > 0) {
      pushModification(collected, {
        source: { name: form.name },
        effects: form.effects,
      });
    }

    const raceId = state.raceId && state.raceId !== "none" ? state.raceId : null;
    const racialBonus = raceId ? game.supernatural.lycanthropy.racialBonuses[raceId] : undefined;
    if (racialBonus?.effects?.length) {
      pushModification(collected, {
        source: { name: racialBonus.name },
        effects: racialBonus.effects,
      });
    }
  }

  for (const mod of collectCharacterOptionModifications(game, state)) {
    pushModification(collected, mod);
  }

  for (const perkId of state.selectedPerkIds) {
    const perk = getPerkById(game, perkId);
    if (!perk) continue;

    if (perk.effects.length > 0) {
      pushModification(
        collected,
        {
          source: { name: perk.name },
          effects: perk.effects,
        },
        perkId,
      );
    }

    if (!perk.extension) continue;

    const extension = getPerkExtension(perk.extension);
    if (!extension) continue;

    const skillId = getPerkSkillId(game, perkId) ?? "";
    const extensionMods = extension.getModifications({
      game,
      state,
      perk,
      skillId,
      skillLevel: skillId ? getStoredSkillLevel(game, state, skillId) : 0,
      isSelected: true,
    });
    for (const mod of extensionMods) {
      pushModification(collected, mod, perkId);
    }
  }

  return collected;
}

export function aggregateModificationEffects(effects: Effect[]): {
  perkPoints: number;
  traitSlots: number;
  skillPointsPerLevel: number;
} {
  let perkPoints = 0;
  let traitSlots = 0;
  let skillPointsPerLevel = 0;

  for (const effect of effects) {
    if (effect.type === "perkPoints") perkPoints += effect.value;
    if (effect.type === "traitSlot") traitSlots += effect.value;
    if (effect.type === "skillPointsPerLevel") skillPointsPerLevel += effect.value;
  }

  return { perkPoints, traitSlots, skillPointsPerLevel };
}

export function sumCollectedBudgetEffects(collected: CollectedBuildChanges): {
  perkPoints: number;
  traitSlots: number;
} {
  const effects = collected.sourcedEffects.map((entry) => entry.effect);
  const totals = aggregateModificationEffects(effects);
  return { perkPoints: totals.perkPoints, traitSlots: totals.traitSlots };
}

export function getPlannerNotesForPerk(
  collected: CollectedBuildChanges,
  perkId: string,
): string[] {
  return collected.plannerNotesByPerkId.get(perkId) ?? [];
}
