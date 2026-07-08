import { Sparkle } from "lucide-react";
import type { MouseEvent, PointerEvent } from "react";
import { HoverTapTooltip } from "@/components/ui/tooltip";
import type { SkillLevelBonusLine } from "@/lib/skillLevelBonuses";
import { cn } from "@/lib/utils";

const bonusIndicatorVisualClassName =
  "text-[var(--color-perk-partial)] drop-shadow-[0_0_4px_color-mix(in_srgb,var(--color-perk-partial)_30%,transparent)] transition-[color,filter] hover:drop-shadow-[0_0_6px_color-mix(in_srgb,var(--color-perk-partial)_45%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-perk-partial)]/35";

function BonusTooltipContent({ lines }: { lines: SkillLevelBonusLine[] }) {
  if (lines.length === 1) {
    const line = lines[0];
    return (
      <div className="flex items-start justify-between gap-6 text-xs leading-relaxed">
        <span className="font-medium tabular-nums text-[var(--color-foreground)]">
          {line.effect}
        </span>
        <span className="shrink-0 text-right text-[var(--color-muted)]">{line.source}</span>
      </div>
    );
  }

  return (
    <ul className="space-y-2 text-xs leading-relaxed">
      {lines.map((line) => (
        <li key={line.key} className="flex items-start justify-between gap-6">
          <span className="font-medium tabular-nums text-[var(--color-foreground)]">
            {line.effect}
          </span>
          <span className="shrink-0 text-right text-[var(--color-muted)]">{line.source}</span>
        </li>
      ))}
    </ul>
  );
}

interface SkillLevelBonusIndicatorProps {
  lines: SkillLevelBonusLine[];
  ariaLabel: string;
  size?: "default" | "compact";
  /** Keep a fixed title-bar slot so nearby icons do not shift when bonuses appear. */
  reserveSpace?: boolean;
  className?: string;
  onClick?: (event: MouseEvent) => void;
  onPointerDown?: (event: PointerEvent) => void;
}

export function SkillLevelBonusIndicator({
  lines,
  ariaLabel,
  size = "default",
  reserveSpace = false,
  className,
  onClick,
  onPointerDown,
}: SkillLevelBonusIndicatorProps) {
  const compact = size === "compact";

  if (lines.length === 0) {
    if (!reserveSpace) return null;
    return (
      <span
        className={cn("inline-flex shrink-0", bonusIndicatorVisualClassName, compact ? "h-4 w-4" : "ml-3 h-5 w-5")}
        aria-hidden="true"
      />
    );
  }

  const iconClassName = cn(
    "inline-flex shrink-0 items-center justify-center rounded-[var(--radius-md)]",
    bonusIndicatorVisualClassName,
    compact ? "h-4 w-4" : "ml-3 h-5 w-5",
    className,
  );

  const icon = (
    <Sparkle
      className={compact ? "h-2.5 w-2.5" : "h-3.5 w-3.5"}
      strokeWidth={compact ? 2.25 : 2}
    />
  );

  return (
    <HoverTapTooltip
      content={<BonusTooltipContent lines={lines} />}
      side="bottom"
      align="start"
      contentClassName="max-w-sm"
    >
      {compact ? (
        <span
          role="img"
          aria-label={ariaLabel}
          onClick={onClick}
          onPointerDown={onPointerDown}
          className={iconClassName}
        >
          {icon}
        </span>
      ) : (
        <button type="button" onClick={onClick} className={iconClassName} aria-label={ariaLabel}>
          {icon}
        </button>
      )}
    </HoverTapTooltip>
  );
}
