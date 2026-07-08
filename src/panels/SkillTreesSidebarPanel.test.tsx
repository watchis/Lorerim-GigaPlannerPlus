/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

// ---- Mocks (keep the test focused on the sticky header regression) ----
const PANEL_TITLE = "Skill Trees";

vi.mock("@/theme/ThemeProvider", () => ({
  usePanelLabels: () => ({
    title: PANEL_TITLE,
    resetAll: "Reset All",
  }),
}));

vi.mock("@/components/BuildVariantsDropdown", () => ({
  BuildVariantsDropdown: () => <div data-testid="variants-dropdown" />,
}));

vi.mock("@/components/ResetPerksButton", () => ({
  ResetPerksButton: ({ children }: { children: ReactNode }) => (
    <button type="button">{children}</button>
  ),
}));

vi.mock("@/components/PerkTreeMiniView", () => ({
  PerkTreeMiniView: () => <div data-testid="perk-tree-mini" />,
}));

vi.mock("@/components/SkillIcon", () => ({
  SkillIcon: () => <div data-testid="skill-icon" />,
}));

vi.mock("@/lib/useContainerSize", async () => {
  const actual = await vi.importActual<typeof import("@/lib/useContainerSize")>("@/lib/useContainerSize");
  return {
    ...actual,
    useContainerSize: () => ({ ref: vi.fn(), width: 600 }),
  };
});

vi.mock("@/engine/buildEngine", async () => {
  const actual = await vi.importActual<typeof import("@/engine/buildEngine")>("@/engine/buildEngine");
  return {
    ...actual,
    // Minimal stub set: enough to render the pane header + first row.
    getOrderedPerkTrees: () => [
      { skillId: "alchemy", skillName: "Alchemy" },
      { skillId: "destiny", skillName: "Destiny" },
    ],
    isAllocatableSkill: () => true,
    getBuildPlayerLevelWarnings: () => ({ perks: [], skillIncreases: [] }),
    getSelectedPerksBelowSkillRequirement: () => [],
    getStoredSkillLevel: () => 60,
    getStoredSkillTraining: () => 0,
    isSkillOverPlayerLevelCap: () => false,
  };
});

import { createInitialBuildState } from "@/engine/buildEngine";
import { useBuildStore } from "@/store/buildStore";
import { SkillTreesSidebarPanel } from "@/panels/SkillTreesSidebarPanel";

describe("SkillTreesSidebarPanel", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    // Provide the minimum store state for the component to render.
    useBuildStore.setState({
      gameData: { game: {} } as any,
      build: createInitialBuildState(),
      computed: null,
    });
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    container?.remove();
    container = null;
    vi.restoreAllMocks();
  });

  it("keeps the pane header sticky while the column scrolls", () => {
    act(() => {
      root!.render(createElement(SkillTreesSidebarPanel));
    });

    const stickyEl = container?.querySelector(".sticky");
    expect(stickyEl).toBeTruthy();
    expect((stickyEl as HTMLDivElement).className).toContain("top-0");
  });
});

