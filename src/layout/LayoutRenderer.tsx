import type { ComponentType } from "react";

import type { Layout } from "@/data/schemas";

import { CharacterSetupPanel } from "@/panels/CharacterSetupPanel";

import { MiddleWorkspacePanel } from "@/panels/MiddleWorkspacePanel";

import { SkillTreesSidebarPanel } from "@/panels/SkillTreesSidebarPanel";

import { cn } from "@/lib/utils";



export const panelRegistry: Record<string, ComponentType> = {

  "character-setup": CharacterSetupPanel,

  "skill-trees": MiddleWorkspacePanel,

  "skill-trees-sidebar": SkillTreesSidebarPanel,

};



interface LayoutRendererProps {

  layout: Layout;

}



export function LayoutRenderer({ layout }: LayoutRendererProps) {

  const desktopTemplate = layout.columns.map((col) => col.width).join(" ");



  return (

    <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col gap-4 overflow-hidden p-4 sm:p-6">

      {/* Mobile / tablet: single column */}

      <div className="flex flex-col gap-4 lg:hidden">

        {layout.columns.flatMap((column) =>

          column.panels.map((panelId) => {

            const Panel = panelRegistry[panelId];

            if (!Panel) return null;

            return <Panel key={panelId} />;

          }),

        )}

      </div>



      {/* Desktop: data-driven grid */}

      <div

        className={cn("hidden min-h-0 flex-1 gap-4 lg:grid")}

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

    </div>

  );

}

