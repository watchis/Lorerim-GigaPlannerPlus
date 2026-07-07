import { Minus, Plus } from "lucide-react";
import { NumericLevelInput } from "@/components/NumericLevelInput";
import { Button } from "@/components/ui/button";
import {
  getAttributePointsPerChoice,
  getRemainingAttributePoints,
  type Attributes,
} from "@/engine/buildEngine";
import { cn } from "@/lib/utils";
import { usePanelLabels } from "@/theme/ThemeProvider";
import { useBuildStore } from "@/store/buildStore";

const ATTRIBUTE_COLORS = {
  health: "var(--color-health)",
  magicka: "var(--color-magicka)",
  stamina: "var(--color-stamina)",
} as const;

const ATTRIBUTE_KEYS: (keyof Attributes)[] = ["health", "magicka", "stamina"];

interface AttributesAllocatorProps {
  embedded?: boolean;
  compact?: boolean;
}

interface AttributeRowProps {
  stat: keyof Attributes;
  label: string;
  value: number;
  choices: number;
  pointsPerChoice: number;
  maxChoices: number;
  compact?: boolean;
  onAdjust: (delta: number) => void;
  onSetChoices: (choices: number) => void;
}

function AttributeControls({
  label,
  choices,
  maxChoices,
  compact,
  onAdjust,
  onSetChoices,
}: {
  label: string;
  choices: number;
  maxChoices: number;
  compact?: boolean;
  onAdjust: (delta: number) => void;
  onSetChoices: (choices: number) => void;
}) {
  return (
    <div className="inline-flex shrink-0 items-center rounded-[var(--radius-md)] border border-[var(--color-border)]/70 bg-[var(--color-background)]/55 p-px">
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "text-[var(--color-muted)] hover:text-[var(--color-foreground)]",
          compact ? "h-5 w-5" : "h-5 w-5",
        )}
        onClick={() => onAdjust(-1)}
        disabled={choices <= 0}
        aria-label={`Remove ${label} choice`}
      >
        <Minus className="h-2.5 w-2.5" />
      </Button>
      <NumericLevelInput
        value={choices}
        min={0}
        max={maxChoices}
        size="compact"
        onCommit={onSetChoices}
      />
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "text-[var(--color-muted)] hover:text-[var(--color-foreground)]",
          compact ? "h-5 w-5" : "h-5 w-5",
        )}
        onClick={() => onAdjust(1)}
        disabled={choices >= maxChoices}
        aria-label={`Add ${label} choice`}
      >
        <Plus className="h-2.5 w-2.5" />
      </Button>
    </div>
  );
}

function AttributeRow({
  stat,
  label,
  value,
  choices,
  pointsPerChoice,
  maxChoices,
  compact = false,
  onAdjust,
  onSetChoices,
}: AttributeRowProps) {
  const color = ATTRIBUTE_COLORS[stat];
  const bonus = choices * pointsPerChoice;

  if (compact) {
    return (
      <div className="relative px-2 py-1.5">
        <div
          className="absolute inset-y-1.5 left-0 w-0.5 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2 pl-2">
          <div className="min-w-0">
            <div
              className="text-[10px] font-semibold leading-tight [overflow-wrap:anywhere]"
              style={{ color }}
            >
              {label}
            </div>
            {choices > 0 ? (
              <div className="mt-0.5 text-[9px] tabular-nums text-[var(--color-muted)]">+{bonus}</div>
            ) : (
              <div className="mt-0.5 text-[9px] text-[var(--color-muted)]/70">—</div>
            )}
          </div>
          <span
            className="shrink-0 font-mono text-sm font-semibold tabular-nums leading-none"
            style={{ color }}
          >
            {value}
          </span>
        </div>
        <div className="mt-1.5 flex justify-end pl-2">
          <AttributeControls
            label={label}
            choices={choices}
            maxChoices={maxChoices}
            compact
            onAdjust={onAdjust}
            onSetChoices={onSetChoices}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex items-center gap-2 px-2.5 py-2">
      <div
        className="absolute inset-y-2 left-0 w-0.5 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <div className="min-w-0 flex-1 pl-2">
        <div className="text-[11px] font-semibold leading-none" style={{ color }}>
          {label}
        </div>
        {choices > 0 ? (
          <div className="mt-1 text-[10px] tabular-nums text-[var(--color-muted)]">+{bonus}</div>
        ) : (
          <div className="mt-1 text-[10px] text-[var(--color-muted)]/70">—</div>
        )}
      </div>
      <span
        className="shrink-0 font-mono text-base font-semibold tabular-nums leading-none"
        style={{ color }}
      >
        {value}
      </span>
      <AttributeControls
        label={label}
        choices={choices}
        maxChoices={maxChoices}
        onAdjust={onAdjust}
        onSetChoices={onSetChoices}
      />
    </div>
  );
}

export function AttributesAllocator({ embedded = false, compact = false }: AttributesAllocatorProps) {
  const labels = usePanelLabels("attributes");
  const gameData = useBuildStore((s) => s.gameData);
  const build = useBuildStore((s) => s.build);
  const computed = useBuildStore((s) => s.computed);
  const adjustAttribute = useBuildStore((s) => s.adjustAttribute);

  if (!gameData || !computed) return null;

  const { game } = gameData;
  const remaining = getRemainingAttributePoints(game, build);
  const overBudget = remaining < 0;
  const attrs = ATTRIBUTE_KEYS.map((key) => ({
    key,
    label: labels[key],
    value: computed.attributes[key],
    choices: build.attributeBonus[key],
    pointsPerChoice: getAttributePointsPerChoice(game, key),
  }));

  return (
    <div className={cn(compact || embedded ? "space-y-2" : "space-y-3")}>
      <div
        className={cn(
          "flex items-center justify-between gap-2 px-0.5",
        )}
      >
        {!embedded && (
          <span className="text-sm font-medium text-[var(--color-foreground)]">{labels.title}</span>
        )}
        {embedded && (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)] [overflow-wrap:anywhere]">
            {labels.title}
          </span>
        )}
        <span
          className={cn(
            "shrink-0 rounded-full border bg-[var(--color-background)]/60 tabular-nums",
            compact || embedded ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
            overBudget
              ? "border-[var(--color-error)]/40 text-[var(--color-error)]"
              : "border-[var(--color-border)]/50 text-[var(--color-muted)]",
          )}
        >
          {remaining} {labels.remainingShort ?? "left"}
        </span>
      </div>

      <div className="divide-y divide-[var(--color-border)]/50 overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]/70 bg-[var(--color-surface-elevated)]/35">
        {attrs.map(({ key, label, value, choices, pointsPerChoice }) => (
          <AttributeRow
            key={key}
            stat={key}
            label={label}
            value={value}
            choices={choices}
            pointsPerChoice={pointsPerChoice}
            maxChoices={choices + remaining}
            compact={compact}
            onAdjust={(delta) => adjustAttribute(key, delta)}
            onSetChoices={(next) => adjustAttribute(key, next - choices)}
          />
        ))}
      </div>
    </div>
  );
}
