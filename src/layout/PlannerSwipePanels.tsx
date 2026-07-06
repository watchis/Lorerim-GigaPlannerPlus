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

import type { Layout } from "@/data/schemas";

import { cn } from "@/lib/utils";
import { getSwipePanelIds } from "@/layout/plannerLayout";
import { panelRegistry } from "@/layout/panelRegistry";
import { isSkillTreeOpenInMiddlePane, useUiStore } from "@/store/uiStore";
import { useThemeConfig } from "@/theme/ThemeProvider";

const CENTER_PANE_INDEX = 1;

const GoToSwipePaneContext = createContext<(index: number) => void>(() => {});

export function useGoToSwipePane(): (index: number) => void {
  return useContext(GoToSwipePaneContext);
}

function getSwipePaneLabel(
  panelId: string,
  panelLabels: Record<string, Record<string, string>>,
): string {
  switch (panelId) {
    case "character-setup":
      return panelLabels["character-setup"]?.title ?? "Setup";
    case "skill-trees":
      return panelLabels["character-setup"]?.overviewTitle ?? "Workspace";
    case "skill-trees-sidebar":
      return panelLabels["skill-trees"]?.title ?? "Skills";
    default:
      return panelId;
  }
}

interface PlannerSwipePanelsProps {
  layout: Layout;
}

export function PlannerSwipePanels({ layout }: PlannerSwipePanelsProps) {
  const { labels } = useThemeConfig();
  const panelLabels = labels.panels;
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

  return (
    <GoToSwipePaneContext.Provider value={scrollToIndex}>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          className="shrink-0 border-b border-[var(--color-border)]/50 bg-[var(--color-surface)]/80 px-1 py-1"
          role="tablist"
          aria-label="Planner sections"
        >
          <div className="grid grid-cols-3 gap-1">
            {panelIds.map((panelId, index) => {
              const label = getSwipePaneLabel(panelId, panelLabels);
              const isActive = index === activeIndex;

              return (
                <button
                  key={panelId}
                  id={`planner-swipe-tab-${panelId}`}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`planner-swipe-pane-${panelId}`}
                  onClick={() => scrollToIndex(index)}
                  className={cn(
                    "rounded-[var(--radius-md)] px-2 py-2 text-center text-xs font-medium transition-colors",
                    isActive
                      ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                      : "text-[var(--color-muted)] hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-foreground)]",
                  )}
                >
                  <span className="block truncate">{label}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-1 px-1 text-center text-[10px] text-[var(--color-muted)] md:hidden">
            Swipe left or right to switch sections
          </p>
        </div>

        <div
          ref={scrollRef}
          className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
        "page-scroll-with-fab h-full w-full shrink-0 snap-start snap-always overflow-y-auto overscroll-y-contain",
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
