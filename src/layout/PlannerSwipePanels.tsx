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
const SWIPE_NAV_HEIGHT = "3.5rem";

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

function getSwipeScrollMetrics(element: HTMLDivElement) {
  const paneWidth = element.clientWidth;
  return { paneWidth, stride: paneWidth };
}

interface PlannerSwipePanelsProps {
  layout: Layout;
}

export function PlannerSwipePanels({ layout }: PlannerSwipePanelsProps) {
  const panelLabels = usePanelLabels("character-setup");
  const skillLabels = usePanelLabels("skill-trees");
  const panelIds = getSwipePanelIds(layout);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(CENTER_PANE_INDEX);
  const [paneWidth, setPaneWidth] = useState(0);
  const activeIndexRef = useRef(activeIndex);
  const isProgrammaticScrollRef = useRef(false);
  activeIndexRef.current = activeIndex;

  const setupPicker = useUiStore((s) => s.setupPicker);
  const characterOptionsOpen = useUiStore((s) => s.characterOptionsOpen);
  const variantsManagerOpen = useUiStore((s) => s.variantsManagerOpen);
  const skillTreeOpen = useUiStore(isSkillTreeOpenInMiddlePane);

  const scrollToIndex = useCallback(
    (index: number, behavior: ScrollBehavior = "auto") => {
      const element = scrollRef.current;
      if (!element || panelIds.length === 0) return;

      const clamped = Math.max(0, Math.min(panelIds.length - 1, index));
      const { stride } = getSwipeScrollMetrics(element);
      activeIndexRef.current = clamped;
      setActiveIndex(clamped);
      isProgrammaticScrollRef.current = true;
      element.scrollTo({
        left: clamped * stride,
        behavior,
      });
      window.setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, behavior === "smooth" ? 350 : 0);
    },
    [panelIds.length],
  );

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const syncLayout = () => {
      const { paneWidth: nextPaneWidth, stride } = getSwipeScrollMetrics(element);
      setPaneWidth((prev) => (prev === nextPaneWidth ? prev : nextPaneWidth));

      const targetLeft = activeIndexRef.current * stride;
      if (Math.abs(element.scrollLeft - targetLeft) > 1) {
        isProgrammaticScrollRef.current = true;
        element.scrollTo({ left: targetLeft, behavior: "auto" });
        window.setTimeout(() => {
          isProgrammaticScrollRef.current = false;
        }, 0);
      }
    };

    const syncActiveIndex = () => {
      if (isProgrammaticScrollRef.current) return;

      const { stride } = getSwipeScrollMetrics(element);
      if (!stride) return;
      const index = Math.round(element.scrollLeft / stride);
      const clamped = Math.max(0, Math.min(panelIds.length - 1, index));
      if (clamped !== activeIndexRef.current) {
        activeIndexRef.current = clamped;
        setActiveIndex(clamped);
      }
    };

    const observer = new ResizeObserver(syncLayout);
    observer.observe(element);
    element.addEventListener("scroll", syncActiveIndex, { passive: true });
    syncLayout();

    return () => {
      observer.disconnect();
      element.removeEventListener("scroll", syncActiveIndex);
    };
  }, [panelIds.length]);

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
    if (panelId === "skill-trees-sidebar") return labels.title ?? "Skills";
    return labels[nav.labelField] ?? panelId;
  };

  const centerPanelId = panelIds[CENTER_PANE_INDEX];

  return (
    <GoToSwipePaneContext.Provider value={scrollToIndex}>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          ref={scrollRef}
          className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{
            touchAction: "pan-x",
            paddingBottom: `calc(${SWIPE_NAV_HEIGHT} + env(safe-area-inset-bottom) + 0.75rem)`,
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
                width={paneWidth}
              >
                <Panel />
              </SwipePane>
            );
          })}
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
                    aria-selected={isActive}
                    aria-label={ariaLabel}
                    aria-controls={`planner-swipe-pane-${panelId}`}
                    onClick={() => scrollToIndex(index)}
                    className={cn(
                      "relative z-10 -mt-4 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 bg-[var(--color-surface)] shadow-[0_6px_20px_rgba(0,0,0,0.4)] transition-colors duration-200",
                      isActive
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
                  onClick={() => scrollToIndex(index)}
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

function SwipePane({
  id,
  isActive,
  fullHeight,
  width,
  children,
}: {
  id: string;
  isActive: boolean;
  fullHeight?: boolean;
  width: number;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      role="tabpanel"
      aria-hidden={!isActive}
      className={cn(
        "planner-swipe-pane h-full shrink-0 snap-start snap-always overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]/50 bg-[var(--color-surface)]",
        fullHeight && "flex flex-col",
      )}
      style={{ width: width > 0 ? width : "100%" }}
    >
      <div
        className={cn(
          "min-h-0 overflow-y-auto overscroll-y-contain",
          fullHeight ? "flex min-h-full flex-1 flex-col" : "pb-2",
        )}
      >
        {children}
      </div>
    </section>
  );
}
