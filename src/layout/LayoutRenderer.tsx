import { useEffect, useRef, useState, type ComponentType, type CSSProperties } from "react";

import type { Layout } from "@/data/schemas";

import { CharacterSetupPanel } from "@/panels/CharacterSetupPanel";

import { MiddleWorkspacePanel } from "@/panels/MiddleWorkspacePanel";

import { SkillTreesSidebarPanel } from "@/panels/SkillTreesSidebarPanel";

import { cn } from "@/lib/utils";

import {
  computePlannerLayoutMetrics,
  getStackedPanelIds,
  PlannerLayoutContext,
  type PlannerLayoutMetrics,
} from "@/layout/plannerLayout";



export const panelRegistry: Record<string, ComponentType> = {

  "character-setup": CharacterSetupPanel,

  "skill-trees": MiddleWorkspacePanel,

  "skill-trees-sidebar": SkillTreesSidebarPanel,

};



const stackedPanelWrapperClass: Record<string, string> = {
  "skill-trees-sidebar":
    "max-h-[min(45dvh,420px)] shrink-0 overflow-hidden",
  "skill-trees": "flex min-h-[min(50dvh,480px)] flex-col",
};

const defaultLayoutMetrics: PlannerLayoutMetrics = {
  useThreeColumnLayout: false,
  scale: 1,
  gridTemplateColumns: null,
  sideWidths: null,
  centerWidth: 0,
};



interface LayoutRendererProps {

  layout: Layout;

}



export function LayoutRenderer({ layout }: LayoutRendererProps) {

  const layoutRef = useRef<HTMLDivElement>(null);
  const [layoutMetrics, setLayoutMetrics] = useState<PlannerLayoutMetrics>(defaultLayoutMetrics);



  useEffect(() => {

    const element = layoutRef.current;

    if (!element) return;



    const update = () => {

      setLayoutMetrics(computePlannerLayoutMetrics(element.clientWidth, layout));

    };



    const observer = new ResizeObserver(update);

    observer.observe(element);

    update();



    return () => observer.disconnect();

  }, [layout]);



  const plannerScaleStyle = {
    "--planner-scale": layoutMetrics.scale,
  } as CSSProperties;

  const stackedPanelIds = getStackedPanelIds(layout);



  return (

    <div className="mx-auto flex min-h-0 w-full max-w-[1800px] flex-1 flex-col gap-4 overflow-hidden p-4 sm:p-6">

      <div ref={layoutRef} className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">

        <PlannerLayoutContext.Provider value={layoutMetrics}>

          {!layoutMetrics.useThreeColumnLayout ? (

            <div className="page-scroll-with-fab flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-y-contain">

              {stackedPanelIds.map((panelId) => {

                const Panel = panelRegistry[panelId];

                if (!Panel) return null;

                const wrapperClass = stackedPanelWrapperClass[panelId];

                return wrapperClass ? (
                  <div key={panelId} className={wrapperClass}>
                    <Panel />
                  </div>
                ) : (
                  <Panel key={panelId} />
                );

              })}

            </div>

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
                  className={cn(
                    "flex min-h-0 flex-col gap-4",
                    colIndex === 1 || colIndex === layout.columns.length - 1
                      ? "overflow-hidden"
                      : "overflow-y-auto overflow-x-hidden",
                  )}
                >
                  {column.panels.map((panelId) => {
                    const Panel = panelRegistry[panelId];
                    const isFullHeight = panelId === "skill-trees" || panelId === "skill-trees-sidebar";

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
                        className={cn(isFullHeight && "flex min-h-0 flex-1 flex-col")}
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

