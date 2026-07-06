import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { LayoutGrid, Trees, UserRound } from "lucide-react";

import type { Layout } from "@/data/schemas";

import { cn } from "@/lib/utils";
import { getSwipePanelIds } from "@/layout/plannerLayout";
import { panelRegistry } from "@/layout/panelRegistry";
import { isSkillTreeOpenInMiddlePane, useUiStore } from "@/store/uiStore";
import { usePanelLabels } from "@/theme/ThemeProvider";

const CENTER_PANE_INDEX = 1;
const SWIPE_NAV_HEIGHT = "4.25rem";

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
    shortLabelField: "title" as const,
  },
  {
    panelId: "skill-trees",
    Icon: LayoutGrid,
    labelKey: "character-setup" as const,
    labelField: "overviewTitle" as const,
    shortLabelField: "overviewTitle" as const,
  },
  {
    panelId: "skill-trees-sidebar",
    Icon: Trees,
    labelKey: "skill-trees" as const,
    labelField: "title" as const,
    shortLabelField: "title" as const,
  },
] as const;

interface PlannerSwipePanelsProps {
  layout: Layout;
}

export function PlannerSwipePanels({ layout }: PlannerSwipePanelsProps) {
  const panelLabels = usePanelLabels("character-setup");
  const skillLabels = usePanelLabels("skill-trees");
  const panelIds = getSwipePanelIds(layout);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(CENTER_PANE_INDEX);
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;

  const setupPicker = useUiStore((s) => s.setupPicker);
  const characterOptionsOpen = useUiStore((s) => s.characterOptionsOpen);
  const variantsManagerOpen = useUiStore((s) => s.variantsManagerOpen);
  const skillTreeOpen = useUiStore(isSkillTreeOpenInMiddlePane);

  const scrollToIndex = useCallback(
    (index: number, behavior: ScrollBehavior = "smooth") => {
      const element = scrollRef.current;
      if (!element || panelIds.length === 0) return;

      const clamped = Math.max(0, Math.min(panelIds.length - 1, index));
      element.scrollTo({
        left: clamped * element.clientWidth,
        behavior,
      });
      setActiveIndex(clamped);
    },
    [panelIds.length],
  );

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const syncActiveIndex = () => {
      if (!element.clientWidth) return;
      const index = Math.round(element.scrollLeft / element.clientWidth);
      if (index !== activeIndexRef.current) {
        setActiveIndex(index);
      }
    };

    const observer = new ResizeObserver(() => {
      scrollToIndex(activeIndexRef.current, "auto");
    });

    observer.observe(element);
    element.addEventListener("scroll", syncActiveIndex, { passive: true });

    return () => {
      observer.disconnect();
      element.removeEventListener("scroll", syncActiveIndex);
    };
  }, [scrollToIndex]);

  useEffect(() => {
    if (setupPicker || characterOptionsOpen || variantsManagerOpen || skillTreeOpen) {
      scrollToIndex(CENTER_PANE_INDEX);
    }
  }, [
    setupPicker,
    characterOptionsOpen,
    variantsManagerOpen,
    skillTreeOpen,
    scrollToIndex,
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
    const full = labels[nav.shortLabelField] ?? panelId;
    if (panelId === "skill-trees-sidebar") return labels.title ?? "Skills";
    if (panelId === "skill-trees") return labels.overviewTitle ?? "Build";
    return full;
  };

  return (
    <GoToSwipePaneContext.Provider value={scrollToIndex}>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          ref={scrollRef}
          className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{
            touchAction: "pan-x",
            paddingBottom: `calc(${SWIPE_NAV_HEIGHT} + env(safe-area-inset-bottom))`,
          }}
        >
          {panelIds.map((panelId, index) => {
            const Panel = panelRegistry[panelId] as ComponentType | undefined;
            if (!Panel) return null;

            const isFullHeight =
              panelId === "skill-trees" || panelId === "skill-trees-sidebar";

            return (
              <SwipePane
                key={panelId}
                id={`planner-swipe-pane-${panelId}`}
                isActive={index === activeIndex}
                fullHeight={isFullHeight}
              >
                <Panel />
              </SwipePane>
            );
          })}
        </div>

        <nav
          className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
          role="tablist"
          aria-label="Planner sections"
        >
          <div className="pointer-events-auto mx-auto flex max-w-md items-stretch gap-1 rounded-2xl border border-[var(--color-border)]/80 bg-[var(--color-surface)]/90 p-1 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            {panelIds.map((panelId, index) => {
              const nav = PANE_NAV.find((item) => item.panelId === panelId);
              const Icon = nav?.Icon ?? LayoutGrid;
              const isActive = index === activeIndex;
              const ariaLabel = getPaneLabel(panelId);
              const shortLabel = getPaneShortLabel(panelId);

              return (
                <button
                  key={panelId}
                  id={`planner-swipe-tab-${panelId}`}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={ariaLabel}
                  aria-controls={`planner-swipe-pane-${panelId}`}
                  onClick={() => scrollToIndex(index)}
                  className={cn(
                    "relative flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 transition-all duration-200",
                    isActive
                      ? "bg-[var(--color-accent)]/14 text-[var(--color-accent)] shadow-[inset_0_0_0_1px_rgba(201,162,39,0.22)]"
                      : "text-[var(--color-muted)] hover:bg-[var(--color-surface-elevated)]/50 hover:text-[var(--color-foreground)]",
                  )}
                >
                  <Icon
                    className={cn("h-5 w-5 shrink-0 transition-transform", isActive && "scale-105")}
                    aria-hidden
                  />
                  <span
                    className={cn(
                      "max-w-full truncate text-[10px] font-medium leading-none tracking-wide",
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

function SwipePane({
  id,
  isActive,
  fullHeight,
  children,
}: {
  id: string;
  isActive: boolean;
  fullHeight?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      role="tabpanel"
      aria-hidden={!isActive}
      className={cn(
        "planner-swipe-pane h-full w-full shrink-0 snap-start snap-always overflow-y-auto overscroll-y-contain",
        fullHeight && "flex flex-col overflow-hidden",
      )}
    >
      <div
        className={cn(
          "min-h-0",
          fullHeight ? "flex min-h-full flex-1 flex-col" : "pb-2",
        )}
      >
        {children}
      </div>
    </section>
  );
}
