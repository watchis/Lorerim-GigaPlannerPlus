import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";

import type { Layout } from "@/data/schemas";

import { cn } from "@/lib/utils";

import {
  computePlannerLayoutMetrics,
  getInitialPlannerLayoutMetrics,
  plannerLayoutMetricsEqual,
  PlannerLayoutContext,
} from "@/layout/plannerLayout";
import { panelRegistry } from "@/layout/panelRegistry";
import { PlannerSwipePanels } from "@/layout/PlannerSwipePanels";

export { panelRegistry };

export function isFullHeightPanel(panelId: string): boolean {
  // Panels that manage their own internal scroll (so their content areas can
  // use `overflow-y-auto`).
  return panelId === "skill-trees" || panelId === "character-setup" || panelId === "skill-trees-sidebar";
}

interface LayoutRendererProps {
  layout: Layout;
}

export function LayoutRenderer({ layout }: LayoutRendererProps) {
  const layoutRef = useRef<HTMLDivElement>(null);
  const [layoutMetrics, setLayoutMetrics] = useState(() => getInitialPlannerLayoutMetrics(layout));

  useLayoutEffect(() => {
    const element = layoutRef.current;
    if (!element) return;

    const update = () => {
      const next = computePlannerLayoutMetrics(element.clientWidth, layout);
      setLayoutMetrics((previous) => (plannerLayoutMetricsEqual(previous, next) ? previous : next));
    };

    const observer = new ResizeObserver(update);
    observer.observe(element);
    update();

    return () => observer.disconnect();
  }, [layout]);

  const plannerScaleStyle = {
    "--planner-scale": layoutMetrics.scale,
  } as CSSProperties;

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-[1800px] flex-1 flex-col overflow-hidden p-2 sm:p-4 lg:p-6">
      <div ref={layoutRef} className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <PlannerLayoutContext.Provider value={layoutMetrics}>
          {!layoutMetrics.useThreeColumnLayout ? (
            <PlannerSwipePanels layout={layout} />
          ) : (
            <div
              className="grid min-h-0 flex-1 gap-4"
              style={{
                ...plannerScaleStyle,
                gridTemplateColumns: layoutMetrics.gridTemplateColumns ?? undefined,
              }}
            >
              {layout.columns.map((column, colIndex) => (
                <div
                  key={colIndex}
                  className="flex min-h-0 flex-col gap-4 overflow-hidden overflow-x-hidden"
                >
                  {column.panels.map((panelId) => {
                    const Panel = panelRegistry[panelId];
                    const fullHeight = isFullHeightPanel(panelId);

                    if (!Panel) {
                      return (
                        <div
                          key={panelId}
                          className="rounded-lg border border-dashed border-[var(--color-border)] p-4 text-[var(--color-muted)]"
                        >
                          Unknown panel: {panelId}
                        </div>
                      );
                    }

                    return (
                      <div
                        key={panelId}
                        className={cn(fullHeight && "flex min-h-0 flex-1 flex-col")}
                      >
                        <Panel />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </PlannerLayoutContext.Provider>
      </div>
    </div>
  );
}
