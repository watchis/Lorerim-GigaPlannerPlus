import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { LayoutGrid, Trees, UserRound } from "lucide-react";

import type { Layout } from "@/data/schemas";

import { cn } from "@/lib/utils";
import { getSwipePanelIds } from "@/layout/plannerLayout";
import { panelRegistry } from "@/layout/panelRegistry";
import { isSkillTreeOpenInMiddlePane, useUiStore } from "@/store/uiStore";
import { usePanelLabels } from "@/theme/ThemeProvider";

const CENTER_PANE_INDEX = 1;
const MOBILE_NAV_HEIGHT = "3.5rem";

const GoToSwipePaneContext = createContext<(index: number) => void>(() => {});

export function useGoToSwipePane(): (index: number) => void {
  return useContext(GoToSwipePaneContext);
}

const PANE_NAV = [
  {
    panelId: "character-setup",
    Icon: UserRound,
    labelKey: "character-setup" as const,
    labelField: "title" as const,
  },
  {
    panelId: "skill-trees",
    Icon: LayoutGrid,
    labelKey: "character-setup" as const,
    labelField: "overviewTitle" as const,
  },
  {
    panelId: "skill-trees-sidebar",
    Icon: Trees,
    labelKey: "skill-trees" as const,
    labelField: "title" as const,
  },
] as const;

interface PlannerSwipePanelsProps {
  layout: Layout;
}

export function PlannerSwipePanels({ layout }: PlannerSwipePanelsProps) {
  const panelLabels = usePanelLabels("character-setup");
  const skillLabels = usePanelLabels("skill-trees");
  const panelIds = getSwipePanelIds(layout);

  const [activeIndex, setActiveIndex] = useState(CENTER_PANE_INDEX);
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;

  const setupPicker = useUiStore((s) => s.setupPicker);
  const setSetupPicker = useUiStore((s) => s.setSetupPicker);
  const characterOptionsOpen = useUiStore((s) => s.characterOptionsOpen);
  const closeCharacterOptions = useUiStore((s) => s.closeCharacterOptions);
  const variantsManagerOpen = useUiStore((s) => s.variantsManagerOpen);
  const closeVariantsManager = useUiStore((s) => s.closeVariantsManager);
  const setMiddleView = useUiStore((s) => s.setMiddleView);
  const setActiveSkillTreeId = useUiStore((s) => s.setActiveSkillTreeId);
  const skillTreeOpen = useUiStore(isSkillTreeOpenInMiddlePane);

  const goToPane = useCallback(
    (index: number) => {
      if (panelIds.length === 0) return;
      const clamped = Math.max(0, Math.min(panelIds.length - 1, index));
      activeIndexRef.current = clamped;
      setActiveIndex(clamped);
    },
    [panelIds.length],
  );

  const goToCharacterOverview = useCallback(() => {
    setSetupPicker(null);
    closeCharacterOptions();
    closeVariantsManager();
    setMiddleView("character-info");
    setActiveSkillTreeId(null);
    goToPane(CENTER_PANE_INDEX);
  }, [
    closeCharacterOptions,
    closeVariantsManager,
    goToPane,
    setActiveSkillTreeId,
    setMiddleView,
    setSetupPicker,
  ]);

  const isCharacterOverviewActive =
    activeIndex === CENTER_PANE_INDEX &&
    !setupPicker &&
    !characterOptionsOpen &&
    !variantsManagerOpen &&
    !skillTreeOpen;

  useEffect(() => {
    if (setupPicker || characterOptionsOpen || variantsManagerOpen || skillTreeOpen) {
      goToPane(CENTER_PANE_INDEX);
    }
  }, [
    setupPicker,
    characterOptionsOpen,
    variantsManagerOpen,
    skillTreeOpen,
    goToPane,
  ]);

  const getPaneLabel = (panelId: string): string => {
    const nav = PANE_NAV.find((item) => item.panelId === panelId);
    if (!nav) return panelId;
    const labels = nav.labelKey === "skill-trees" ? skillLabels : panelLabels;
    return labels[nav.labelField] ?? panelId;
  };

  const getPaneShortLabel = (panelId: string): string => {
    const nav = PANE_NAV.find((item) => item.panelId === panelId);
    if (!nav) return panelId;
    const labels = nav.labelKey === "skill-trees" ? skillLabels : panelLabels;
    if (panelId === "skill-trees-sidebar") return labels.title ?? "Skills";
    return labels[nav.labelField] ?? panelId;
  };

  const centerPanelId = panelIds[CENTER_PANE_INDEX];
  const activePanelId = panelIds[activeIndex];
  const ActivePanel = activePanelId
    ? (panelRegistry[activePanelId] as ComponentType | undefined)
    : undefined;

  return (
    <GoToSwipePaneContext.Provider value={goToPane}>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
          style={{
            paddingBottom: `calc(${MOBILE_NAV_HEIGHT} + env(safe-area-inset-bottom) + 0.75rem)`,
          }}
        >
          {ActivePanel && activePanelId && (
            <section
              id={`planner-swipe-pane-${activePanelId}`}
              role="tabpanel"
              aria-labelledby={`planner-swipe-tab-${activePanelId}`}
              className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]/50 bg-[var(--color-surface)]"
            >
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <ActivePanel />
              </div>
            </section>
          )}
        </div>

        <nav
          className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-4 pb-[max(0.375rem,env(safe-area-inset-bottom))]"
          role="tablist"
          aria-label="Planner sections"
        >
          <div className="pointer-events-auto mx-auto flex max-w-sm items-end justify-between gap-1 rounded-full border border-[var(--color-border)]/60 bg-[var(--color-surface)]/88 px-2 py-1 shadow-[0_4px_24px_rgba(0,0,0,0.4)] backdrop-blur-xl">
            {panelIds.map((panelId, index) => {
              const nav = PANE_NAV.find((item) => item.panelId === panelId);
              const Icon = nav?.Icon ?? LayoutGrid;
              const isActive = index === activeIndex;
              const ariaLabel = getPaneLabel(panelId);
              const shortLabel = getPaneShortLabel(panelId);
              const isCenter = panelId === centerPanelId;

              if (isCenter) {
                return (
                  <button
                    key={panelId}
                    id={`planner-swipe-tab-${panelId}`}
                    type="button"
                    role="tab"
                    aria-selected={isCharacterOverviewActive}
                    aria-label={ariaLabel}
                    aria-controls={`planner-swipe-pane-${panelId}`}
                    onClick={goToCharacterOverview}
                    className={cn(
                      "relative z-10 -mt-4 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 bg-[var(--color-surface)] shadow-[0_6px_20px_rgba(0,0,0,0.4)] transition-colors duration-200",
                      isCharacterOverviewActive
                        ? "border-[var(--color-accent)] text-[var(--color-accent)]"
                        : "border-[var(--color-border)] text-[var(--color-muted)]",
                    )}
                  >
                    <Icon className="h-6 w-6" aria-hidden />
                  </button>
                );
              }

              return (
                <button
                  key={panelId}
                  id={`planner-swipe-tab-${panelId}`}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={ariaLabel}
                  aria-controls={`planner-swipe-pane-${panelId}`}
                  onClick={() => goToPane(index)}
                  className={cn(
                    "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-2 py-1 transition-colors duration-200",
                    isActive
                      ? "text-[var(--color-accent)]"
                      : "text-[var(--color-muted)]",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  <span
                    className={cn(
                      "max-w-full truncate text-[9px] font-medium leading-none tracking-wide",
                      isActive ? "text-[var(--color-accent)]" : "text-[var(--color-muted)]",
                    )}
                  >
                    {shortLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </GoToSwipePaneContext.Provider>
  );
}
