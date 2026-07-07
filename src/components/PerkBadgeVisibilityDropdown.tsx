import { Eye } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import {
  claimExclusiveTouchOverlay,
  releaseExclusiveTouchOverlay,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  hasAnyPerkBadgeVisibility,
  type PerkBadgeVisibilityKey,
  useUiStore,
} from "@/store/uiStore";

const OVERLAY_ID = "perk-badge-visibility-dropdown";

const VISIBILITY_OPTIONS: PerkBadgeVisibilityKey[] = [
  "skillLevelReq",
  "playerLevelReq",
  "skillName",
];

type PerkBadgeVisibilityDropdownProps = {
  labels: Record<string, string>;
  className?: string;
  iconClassName?: string;
};

export function PerkBadgeVisibilityDropdown({
  labels,
  className,
  iconClassName,
}: PerkBadgeVisibilityDropdownProps) {
  const visibility = useUiStore((s) => s.perkBadgeVisibility);
  const togglePerkBadgeVisibility = useUiStore((s) => s.togglePerkBadgeVisibility);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const isActive = hasAnyPerkBadgeVisibility(visibility);

  const optionLabels: Record<PerkBadgeVisibilityKey, string> = {
    skillLevelReq: labels.skillReq,
    playerLevelReq: labels.playerLevelReq,
    skillName: labels.showSkillName,
  };

  useEffect(() => {
    if (!open) return;
    claimExclusiveTouchOverlay(OVERLAY_ID);
    return () => releaseExclusiveTouchOverlay(OVERLAY_ID);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setMenuPosition(null);
      return;
    }

    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const width = 220;
      const left = Math.min(
        Math.max(8, rect.right - width),
        window.innerWidth - width - 8,
      );
      setMenuPosition({
        top: rect.bottom + 6,
        left,
        width,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const handleToggleOpen = () => {
    setOpen((value) => {
      const next = !value;
      if (next) claimExclusiveTouchOverlay(OVERLAY_ID);
      else releaseExclusiveTouchOverlay(OVERLAY_ID);
      return next;
    });
  };

  const menu =
    open && menuPosition
      ? createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={labels.showSkillRequirements}
            className="fixed z-[90] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-2 shadow-[var(--shadow-panel)]"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
            }}
          >
            <p className="px-2 pb-1.5 text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
              {labels.showSkillRequirements}
            </p>
            <div className="space-y-0.5">
              {VISIBILITY_OPTIONS.map((key) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-xs text-[var(--color-foreground)] hover:bg-[var(--color-surface)]"
                >
                  <input
                    type="checkbox"
                    checked={visibility[key]}
                    onChange={() => togglePerkBadgeVisibility(key)}
                    className="h-3.5 w-3.5 shrink-0 accent-[var(--color-accent)]"
                  />
                  <span>{optionLabels[key]}</span>
                </label>
              ))}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        variant={isActive ? "default" : "ghost"}
        size="icon"
        className={cn("h-9 w-9", className)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
        aria-label={labels.showSkillRequirements}
        onClick={handleToggleOpen}
      >
        <Eye className={cn("h-4 w-4", iconClassName)} />
      </Button>
      {menu}
    </>
  );
}
