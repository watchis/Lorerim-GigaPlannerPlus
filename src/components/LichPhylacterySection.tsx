import { SkillIcon } from "@/components/SkillIcon";
import {
  formatLichPhylacteryNextUnlockSubtitle,
  getLichPhylactery,
  getLichSoulCount,
} from "@/lib/lichPhylactery";
import { isLichActive } from "@/lib/supernatural";
import { usePanelLabels } from "@/theme/ThemeProvider";
import { useBuildStore } from "@/store/buildStore";

export function LichPhylacterySection() {
  const labels = usePanelLabels("character-setup");
  const game = useBuildStore((s) => s.gameData?.game);
  const build = useBuildStore((s) => s.build);

  if (!game || !isLichActive(build)) return null;

  const phylactery = getLichPhylactery(game);
  const souls = getLichSoulCount(game, build);
  const nextUnlock = formatLichPhylacteryNextUnlockSubtitle(
    phylactery,
    souls,
    labels.lichPhylacteryNext ?? "Next unlock at {count} souls: {name}",
  );

  return (
    <div className="space-y-1 border-t border-[var(--color-border)]/70 pt-3">
      <div className="flex items-center gap-1.5">
        <SkillIcon skillId="lich" className="h-3.5 w-3.5 text-[var(--color-accent)]" />
        <p className="text-[11px] font-semibold tracking-tight text-[var(--color-foreground)]">
          {labels.lichPhylacteryTitle ?? "Lich Phylactery"}
        </p>
        <span className="ml-auto text-[11px] font-semibold tabular-nums text-[var(--color-accent)]">
          {souls} / {phylactery.maxSouls}
        </span>
      </div>
      {nextUnlock && (
        <p className="text-[11px] leading-relaxed text-[var(--color-muted)]">{nextUnlock}</p>
      )}
    </div>
  );
}
