import { VariantsManagerPanel } from "@/panels/VariantsManagerPanel";
import { useUiStore } from "@/store/uiStore";
import { CharacterOptionsPanel } from "@/panels/CharacterOptionsPanel";
import { CharacterSetupInfoPanel } from "@/panels/CharacterSetupInfoPanel";
import { SetupPickerPanel } from "@/panels/SetupPickerPanel";
import { SkillTreePanel } from "@/panels/SkillTreePanel";
import { usePlannerStackedLayout } from "@/layout/plannerLayout";
import { cn } from "@/lib/utils";

export function MiddleWorkspacePanel() {
  const setupPicker = useUiStore((s) => s.setupPicker);
  const characterOptionsOpen = useUiStore((s) => s.characterOptionsOpen);
  const variantsManagerOpen = useUiStore((s) => s.variantsManagerOpen);
  const middleView = useUiStore((s) => s.middleView);
  const stackedLayout = usePlannerStackedLayout();

  return (
    <div
      id="middle-workspace"
      className={cn(
        "flex min-h-0 flex-1 flex-col",
        stackedLayout && "h-full overflow-hidden bg-[var(--color-surface)]",
      )}
    >
      {setupPicker ? (
        <SetupPickerPanel />
      ) : characterOptionsOpen ? (
        <CharacterOptionsPanel />
      ) : variantsManagerOpen ? (
        <VariantsManagerPanel />
      ) : middleView === "skill-trees" ? (
        <SkillTreePanel />
      ) : (
        <CharacterSetupInfoPanel />
      )}
    </div>
  );
}
