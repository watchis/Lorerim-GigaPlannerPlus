import { VariantsManagerPanel } from "@/panels/VariantsManagerPanel";
import { useUiStore } from "@/store/uiStore";
import { CharacterOptionsPanel } from "@/panels/CharacterOptionsPanel";
import { CharacterSetupInfoPanel } from "@/panels/CharacterSetupInfoPanel";
import { SetupPickerPanel } from "@/panels/SetupPickerPanel";
import { SkillTreePanel } from "@/panels/SkillTreePanel";

export function MiddleWorkspacePanel() {
  const setupPicker = useUiStore((s) => s.setupPicker);
  const characterOptionsOpen = useUiStore((s) => s.characterOptionsOpen);
  const variantsManagerOpen = useUiStore((s) => s.variantsManagerOpen);
  const middleView = useUiStore((s) => s.middleView);

  return (
    <div id="middle-workspace" className="flex min-h-0 flex-1 flex-col">
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
