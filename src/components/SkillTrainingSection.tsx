import { Minus, Plus } from "lucide-react";
import { NumericLevelInput } from "@/components/NumericLevelInput";
import { Button } from "@/components/ui/button";
import {
  getMaxTrainingSkillLevel,
  getRemainingTrainingLevels,
  getSkillFloor,
  getSkillTrainingRanges,
  getStoredSkillTraining,
  getTrainingTierDefinitions,
} from "@/engine/buildEngine";
import type { GameData } from "@/data/schemas";
import type { BuildState } from "@/engine/buildEngine";
import { sumTrainingRanges } from "@/lib/skillTraining";
import { useBuildStore } from "@/store/buildStore";

function formatLabel(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, String(value)),
    template,
  );
}

interface SkillTrainingSectionProps {
  game: GameData;
  build: BuildState;
  skillId: string;
  labels: Record<string, string>;
}

export function SkillTrainingSection({
  game,
  build,
  skillId,
  labels,
}: SkillTrainingSectionProps) {
  const setSkillTrainingRange = useBuildStore((s) => s.setSkillTrainingRange);
  const floor = getSkillFloor(game, build, skillId);
  const tiers = getTrainingTierDefinitions(game);
  const ranges = getSkillTrainingRanges(game, build, skillId);
  const trainedOnSkill = getStoredSkillTraining(game, build, skillId);
  const maxTrainingSkillLevel = getMaxTrainingSkillLevel(game);
  const maxOnSkill = Math.max(0, maxTrainingSkillLevel - floor);
  const globalRemaining = getRemainingTrainingLevels(game, build);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
      <div className="flex flex-wrap gap-x-6 gap-y-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/40 px-4 py-3 text-xs">
        <div>
          <span className="text-[var(--color-muted)]">{labels.trainingSkillTotal}: </span>
          <span className="font-medium tabular-nums text-[var(--color-foreground)]">
            {trainedOnSkill}
          </span>
          {maxOnSkill > 0 && (
            <span className="text-[var(--color-muted)]"> / {maxOnSkill}</span>
          )}
        </div>
        <div className="text-[var(--color-muted)]">
          {formatLabel(labels.trainingMaxLevel, { max: maxTrainingSkillLevel })}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
            {labels.trainingRangesTitle}
          </p>
          <a
            href="https://en.uesp.net/wiki/Skyrim:Trainers"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-muted)] hover:underline"
          >
            {labels.findTrainers}
          </a>
        </div>

        {tiers.map((tier, tierIndex) => {
          const count = ranges[tierIndex] ?? 0;
          const otherTotal = sumTrainingRanges(
            ranges.map((value, index) => (index === tierIndex ? 0 : value)),
          );
          const canIncrease =
            count < tier.tierCapacity &&
            trainedOnSkill < maxOnSkill &&
            otherTotal + count < maxOnSkill &&
            globalRemaining > 0;

          return (
            <div
              key={`${tier.minLevel}-${tier.maxLevel}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]/60 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--color-foreground)]">
                  {formatLabel(labels.trainingTierRange, {
                    min: tier.minLevel,
                    max: tier.maxLevel,
                  })}
                </p>
              </div>

              <div className="inline-flex items-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/50 p-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setSkillTrainingRange(skillId, tierIndex, count - 1)}
                  disabled={count <= 0}
                >
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <NumericLevelInput
                  value={count}
                  min={0}
                  max={tier.tierCapacity}
                  onCommit={(next) => setSkillTrainingRange(skillId, tierIndex, next)}
                  className="w-12"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setSkillTrainingRange(skillId, tierIndex, count + 1)}
                  disabled={!canIncrease}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
