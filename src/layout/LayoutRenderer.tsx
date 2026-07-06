import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";

import type { Layout } from "@/data/schemas";

import { CharacterSetupPanel } from "@/panels/CharacterSetupPanel";

import { MiddleWorkspacePanel } from "@/panels/MiddleWorkspacePanel";

import { SkillTreesSidebarPanel } from "@/panels/SkillTreesSidebarPanel";

import { cn } from "@/lib/utils";

import {
  canShowThreeColumnLayout,
  getThreeColumnMinWidth,
  PlannerLayoutContext,
} from "@/layout/plannerLayout";



export const panelRegistry: Record<string, ComponentType> = {

  "character-setup": CharacterSetupPanel,

  "skill-trees": MiddleWorkspacePanel,

  "skill-trees-sidebar": SkillTreesSidebarPanel,

};



const mobilePanelWrapperClass: Record<string, string> = {
  "skill-trees": "flex min-h-[min(70dvh,720px)] flex-col",
  "skill-trees-sidebar": "shrink-0",
};



interface LayoutRendererProps {

  layout: Layout;

}



function getDesktopGridTemplate(layout: Layout): string {
  return layout.columns
    .map((col) => {
      const width = col.width.trim();
      if (width.endsWith("px")) {
        const px = Number.parseInt(width, 10);
        if (!Number.isNaN(px)) {
          const min = Math.round(px * 0.75);
          return `minmax(${min}px, ${width})`;
        }
      }
      return width;
    })
    .join(" ");
}



export function LayoutRenderer({ layout }: LayoutRendererProps) {

  const desktopTemplate = getDesktopGridTemplate(layout);
  const threeColumnMinWidth = useMemo(() => getThreeColumnMinWidth(layout), [layout]);
  const layoutRef = useRef<HTMLDivElement>(null);
  const [useThreeColumnLayout, setUseThreeColumnLayout] = useState(false);



  useEffect(() => {

    const element = layoutRef.current;

    if (!element) return;



    const update = () => {

      setUseThreeColumnLayout(canShowThreeColumnLayout(element.clientWidth, layout));

    };



    const observer = new ResizeObserver(update);

    observer.observe(element);

    update();



    return () => observer.disconnect();

  }, [layout]);



  return (

    <div
      className="mx-auto flex min-h-0 w-full flex-1 flex-col gap-4 overflow-hidden p-4 sm:p-6"
      style={{ maxWidth: threeColumnMinWidth + 48 }}
    >

      <div ref={layoutRef} className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">

        <PlannerLayoutContext.Provider value={useThreeColumnLayout}>

          {!useThreeColumnLayout ? (

            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-y-contain">

              {layout.columns.flatMap((column) =>

                column.panels.map((panelId) => {

                  const Panel = panelRegistry[panelId];

                  if (!Panel) return null;

                  const wrapperClass = mobilePanelWrapperClass[panelId];

                  return wrapperClass ? (
                    <div key={panelId} className={wrapperClass}>
                      <Panel />
                    </div>
                  ) : (
                    <Panel key={panelId} />
                  );

                }),

              )}

            </div>

          ) : (

            <div

              className="grid min-h-0 flex-1 gap-4"

              style={{ gridTemplateColumns: desktopTemplate }}

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

