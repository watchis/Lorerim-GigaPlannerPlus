import type { ComponentType } from "react";

import { CharacterSetupPanel } from "@/panels/CharacterSetupPanel";
import { MiddleWorkspacePanel } from "@/panels/MiddleWorkspacePanel";
import { SkillTreesSidebarPanel } from "@/panels/SkillTreesSidebarPanel";

export const panelRegistry: Record<string, ComponentType> = {
  "character-setup": CharacterSetupPanel,
  "skill-trees": MiddleWorkspacePanel,
  "skill-trees-sidebar": SkillTreesSidebarPanel,
};
