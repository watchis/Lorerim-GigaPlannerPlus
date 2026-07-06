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

  const getPaneAriaLabel = (panelId: string): string => {
    const nav = PANE_NAV.find((item) => item.panelId === panelId);
    if (!nav) return panelId;
    const labels = nav.labelKey === "skill-trees" ? skillLabels : panelLabels;
    return labels[nav.labelField] ?? panelId;
  };

  return (
    <GoToSwipePaneContext.Provider value={scrollToIndex}>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          ref={scrollRef}
          className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain pb-[calc(3.75rem+env(safe-area-inset-bottom))] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ touchAction: "pan-x" }}
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
          className="absolute inset-x-0 bottom-0 z-20 border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md"
          role="tablist"
          aria-label="Planner sections"
        >
          <div className="mx-auto flex max-w-lg items-center justify-around gap-1 px-3 pt-1.5">
            {panelIds.map((panelId, index) => {
              const nav = PANE_NAV.find((item) => item.panelId === panelId);
              const Icon = nav?.Icon ?? LayoutGrid;
              const isActive = index === activeIndex;
              const ariaLabel = getPaneAriaLabel(panelId);

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
                    "relative flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] px-2 py-1.5 transition-colors",
                    isActive
                      ? "text-[var(--color-accent)]"
                      : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full border transition-colors",
                      isActive
                        ? "border-[var(--color-accent)]/40 bg-[var(--color-accent)]/12"
                        : "border-transparent bg-[var(--color-surface-elevated)]/40",
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span
                    className={cn(
                      "h-1 w-1 rounded-full transition-opacity",
                      isActive
                        ? "bg-[var(--color-accent)] opacity-100"
                        : "bg-[var(--color-muted)] opacity-35",
                    )}
                    aria-hidden
                  />
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
        fullHeight && "flex flex-col",
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
