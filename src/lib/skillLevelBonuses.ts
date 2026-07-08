import type { GameData } from "@/data/schemas";
import type { BuildState } from "@/engine/buildEngine";
import { getRaceById, getStoredSkillTraining } from "@/engine/buildEngine";
import {
  getOghmaFloorBonus,
  getOghmaFreeSkillLevels,
  isOghmaSkillActive,
} from "@/lib/oghmaInfinium";
import {
  getSkillLevelGrantBreakdown,
  getSkillLevelGrantFreeTopLevels,
} from "@/lib/skillLevelGrants";

export interface SkillLevelBonusLine {
  key: string;
  effect: string;
  source: string;
}

const OGHMA_SOURCE_LABEL_KEY = "oghmaInfinium";

function formatLabel(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, String(value)),
    template,
  );
}

function labelOrFallback(labels: Record<string, string>, key: string, fallback: string): string {
  return labels[key] ?? fallback;
}

function pushLine(
  lines: SkillLevelBonusLine[],
  key: string,
  effect: string,
  source: string,
): void {
  lines.push({ key, effect, source });
}

export function getSkillLevelBonusLines(
  game: GameData,
  state: BuildState,
  skillId: string,
  labels: Record<string, string>,
): SkillLevelBonusLine[] {
  const lines: SkillLevelBonusLine[] = [];
  const race = getRaceById(game, state.raceId);
  const raceStarting = race?.startingSkills[skillId] ?? 0;
  const floorEffect = labelOrFallback(
    labels,
    "skillBonusEffectFloorMinimum",
    "+{count} level minimum",
  );
  const freeLevelsEffect = labelOrFallback(
    labels,
    "skillBonusEffectFreeLevels",
    "+{count} free levels",
  );
  const effectiveEffect = labelOrFallback(
    labels,
    "skillBonusEffectEffectiveLevel",
    "+{count} effective levels",
  );

  if (raceStarting > 0) {
    pushLine(
      lines,
      "race-starting",
      formatLabel(floorEffect, { count: raceStarting }),
      race?.name ?? labelOrFallback(labels, "skillBonusSourceRace", "Race"),
    );
  }

  if (state.majorSkillIds.includes(skillId)) {
    pushLine(
      lines,
      "major-skill",
      formatLabel(floorEffect, { count: game.mechanics.majorSkillBonus }),
      labelOrFallback(labels, "skillBonusSourceMajor", "Major Skill"),
    );
  }

  if (state.minorSkillIds.includes(skillId)) {
    pushLine(
      lines,
      "minor-skill",
      formatLabel(floorEffect, { count: game.mechanics.minorSkillBonus }),
      labelOrFallback(labels, "skillBonusSourceMinor", "Minor Skill"),
    );
  }

  if (isOghmaSkillActive(state, skillId)) {
    const oghmaSource =
      labels[OGHMA_SOURCE_LABEL_KEY] ??
      labels.skillBonusSourceOghma ??
      "Oghma Infinium";
    const oghmaFloorBonus = getOghmaFloorBonus(game, state, skillId);
    if (oghmaFloorBonus > 0) {
      pushLine(
        lines,
        "oghma-floor",
        formatLabel(floorEffect, { count: oghmaFloorBonus }),
        oghmaSource,
      );
    }

    const freeTopLevels = Math.max(
      getSkillLevelGrantFreeTopLevels(game, state, skillId),
      getOghmaFreeSkillLevels(game),
    );
    if (freeTopLevels > 0) {
      pushLine(
        lines,
        "oghma-free-top",
        formatLabel(freeLevelsEffect, { count: freeTopLevels }),
        oghmaSource,
      );
    }
  }

  const trainingCount = getStoredSkillTraining(game, state, skillId);
  if (trainingCount > 0) {
    pushLine(
      lines,
      "training",
      formatLabel(freeLevelsEffect, { count: trainingCount }),
      labelOrFallback(labels, "skillBonusSourceTraining", "Training"),
    );
  }

  for (const grant of getSkillLevelGrantBreakdown(game, state, skillId)) {
    if (
      grant.sourceLabelKey === OGHMA_SOURCE_LABEL_KEY ||
      (isOghmaSkillActive(state, skillId) && grant.freeTopLevels)
    ) {
      continue;
    }

    const source =
      grant.sourceLabelKey && labels[grant.sourceLabelKey]
        ? labels[grant.sourceLabelKey]
        : grant.sourceName;

    if (grant.raiseFloor && grant.bonus > 0) {
      pushLine(
        lines,
        `grant-floor-${grant.sourceName}`,
        formatLabel(floorEffect, { count: grant.bonus }),
        source,
      );
    }

    if (grant.bonus > 0 && !grant.raiseFloor) {
      pushLine(
        lines,
        `grant-bonus-${grant.sourceName}`,
        formatLabel(effectiveEffect, { count: grant.bonus }),
        source,
      );
    }

    if ((grant.freeTopLevels ?? 0) > 0) {
      pushLine(
        lines,
        `grant-free-top-${grant.sourceName}`,
        formatLabel(freeLevelsEffect, { count: grant.freeTopLevels }),
        source,
      );
    }
  }

  return lines.sort((a, b) => {
    const bySource = a.source.localeCompare(b.source, undefined, { sensitivity: "base" });
    if (bySource !== 0) return bySource;
    return a.effect.localeCompare(b.effect, undefined, { sensitivity: "base" });
  });
}
