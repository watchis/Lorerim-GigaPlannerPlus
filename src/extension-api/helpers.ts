import type { Effect } from "@/data/schemas";

export function scaleDerivedStatBySkillLevel(
  stat: string,
  skillLevel: number,
  percentPerLevel: number,
  opts?: { isPercent?: boolean },
): Effect {
  return {
    type: "derivedStat",
    stat,
    value: skillLevel * percentPerLevel,
    isPercent: opts?.isPercent ?? true,
  };
}
