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
const SWIPE_PANE_GAP_PX = 12;
const SWIPE_PANE_INSET_PX = 12;

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
  const paneWidth = Math.max(0, element.clientWidth - SWIPE_PANE_INSET_PX * 2);
  const stride = paneWidth + SWIPE_PANE_GAP_PX;
  return { paneWidth, stride };
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
      const { stride } = getSwipeScrollMetrics(element);
      element.scrollTo({
        left: clamped * stride,
        behavior,
      });
      setActiveIndex(clamped);
    },
    [panelIds.length],
  );

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const syncLayout = () => {
      const { paneWidth: nextPaneWidth, stride } = getSwipeScrollMetrics(element);
      setPaneWidth(nextPaneWidth);
      element.scrollTo({
        left: activeIndexRef.current * stride,
        behavior: "auto",
      });
    };

    const syncActiveIndex = () => {
      const { stride } = getSwipeScrollMetrics(element);
      if (!stride) return;
      const index = Math.round(element.scrollLeft / stride);
      const clamped = Math.max(0, Math.min(panelIds.length - 1, index));
      if (clamped !== activeIndexRef.current) {
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
            gap: SWIPE_PANE_GAP_PX,
            paddingInline: SWIPE_PANE_INSET_PX,
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
                width={paneWidth}
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
          <div className="pointer-events-auto relative mx-auto max-w-md rounded-2xl border border-[var(--color-border)]/80 bg-[var(--color-surface)]/92 px-2 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <div
              className="pointer-events-none absolute left-14 right-14 top-[1.35rem] h-px bg-[var(--color-border)]"
              aria-hidden
            />
            <div className="relative flex items-end gap-1">
            {panelIds.map((panelId, index) => {
              const nav = PANE_NAV.find((item) => item.panelId === panelId);
              const Icon = nav?.Icon ?? LayoutGrid;
              const isActive = index === activeIndex;
              const ariaLabel = getPaneLabel(panelId);
              const shortLabel = getPaneShortLabel(panelId);
              const isCenter = panelId === centerPanelId;

              if (isCenter) {
                return (
                  <div
                    key={panelId}
                    className="relative flex w-[4.25rem] shrink-0 items-center justify-center self-center pb-0.5"
                  >
                    <button
                      id={`planner-swipe-tab-${panelId}`}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      aria-label={ariaLabel}
                      aria-controls={`planner-swipe-pane-${panelId}`}
                      onClick={() => scrollToIndex(index)}
                      className={cn(
                        "relative z-10 flex h-11 w-11 items-center justify-center rounded-full border-2 bg-[var(--color-surface)] shadow-[0_4px_16px_rgba(0,0,0,0.35)] transition-all duration-200",
                        isActive
                          ? "border-[var(--color-accent)] text-[var(--color-accent)] shadow-[0_0_0_4px_rgba(201,162,39,0.12)]"
                          : "border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-accent-muted)] hover:text-[var(--color-foreground)]",
                      )}
                    >
                      <Icon className="h-5 w-5" aria-hidden />
                    </button>
                  </div>
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
                    "flex min-h-11 min-w-0 flex-1 flex-col items-center justify-end gap-0.5 rounded-xl px-2 py-1.5 transition-colors duration-200",
                    isActive
                      ? "text-[var(--color-accent)]"
                      : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]",
                  )}
                >
                  <Icon
                    className={cn("h-5 w-5 shrink-0", isActive && "scale-105")}
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
        "planner-swipe-pane h-full shrink-0 snap-start snap-always overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]/60 bg-[var(--color-surface)] shadow-[0_2px_12px_rgba(0,0,0,0.2)]",
        fullHeight && "flex flex-col",
      )}
      style={{ width: width > 0 ? width : undefined }}
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
