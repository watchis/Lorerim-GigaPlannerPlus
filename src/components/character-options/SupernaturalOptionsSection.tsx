import type { ReactNode } from "react";
import { Moon, Sparkles } from "lucide-react";
import { SkillIcon } from "@/components/SkillIcon";
import { cn } from "@/lib/utils";
import type { SupernaturalThemeVariant } from "@/lib/supernaturalTheme";

interface SupernaturalOptionsSectionProps {
  title: string;
  description?: string;
  activeVariant: SupernaturalThemeVariant | null;
  activeBadgeLabel?: string;
  children: ReactNode;
}

export function SupernaturalOptionsSection({
  title,
  description,
  activeVariant,
  activeBadgeLabel,
  children,
}: SupernaturalOptionsSectionProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-[var(--radius-lg)] border transition-colors",
        activeVariant
          ? "border-[var(--color-accent)]/30 bg-[var(--color-accent)]/[0.03] shadow-[var(--shadow-glow)]"
          : "border-[var(--color-border)]/70 bg-[var(--color-surface-elevated)]/20",
      )}
    >
      <div
        className={cn(
          "border-b px-3.5 py-3",
          activeVariant
            ? "border-[var(--color-accent)]/20 bg-[var(--color-accent)]/[0.05]"
            : "border-[var(--color-border)]/50 bg-[var(--color-surface-elevated)]/35",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2.5">
            <span
              className={cn(
                "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] border",
                activeVariant
                  ? "border-[var(--color-accent)]/35 bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                  : "border-[var(--color-border)]/60 bg-[var(--color-background)]/50 text-[var(--color-muted)]",
              )}
            >
              {activeVariant === "werewolf" ? (
                <SkillIcon skillId="werewolf" className="h-4 w-4" />
              ) : activeVariant === "lich" ? (
                <SkillIcon skillId="lich" className="h-4 w-4" />
              ) : activeVariant === "vampire" ? (
                <Moon className="h-4 w-4" aria-hidden />
              ) : (
                <Sparkles className="h-4 w-4 opacity-70" aria-hidden />
              )}
            </span>
            <div className="min-w-0 space-y-1">
              <h2 className="font-[family-name:var(--font-heading)] text-sm font-semibold tracking-wide text-[var(--color-foreground)]">
                {title}
              </h2>
              {description && (
                <p className="text-xs leading-relaxed text-[var(--color-muted)]">{description}</p>
              )}
            </div>
          </div>
          {activeVariant && activeBadgeLabel && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-accent)]">
              {activeBadgeLabel}
            </span>
          )}
        </div>
      </div>
      <div className="space-y-3 p-3.5">{children}</div>
    </section>
  );
}
