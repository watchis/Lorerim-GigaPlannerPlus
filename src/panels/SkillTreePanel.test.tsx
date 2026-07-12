/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

vi.mock("@/theme/ThemeProvider", () => ({
  usePanelLabels: (panelId: string) => {
    if (panelId === "skill-trees") {
      return {
        skillReqConflictSingle: "Skill req conflict: {perk}",
        skillReqConflictMultiple: "Skill req conflict: {count}",
        playerLevelPerkConflictSingle: "Player level conflict: {perk}",
        playerLevelPerkConflictMultiple: "Player level conflict: {count}",
        destinyOverBudgetSingle: "Destiny conflict: {perk}",
        destinyOverBudgetMultiple: "Destiny conflict: {count}",
        skillLevelOverCapSingle: "Over cap: {skill} {skillLevel}/{maxAllowed}",
        skillLevelIncreaseOverLimitSingle: "Over increase: {skill}",

        trainingAssignedIndicator: "{count} assigned",
        skillTreeWarning: "Skill tree warnings",

        perksSelected: "perks selected",
        perksMode: "Perks",
        trainingMode: "Training",
        trainingModeActive: "Training mode active",

        skillLevel: "Skill Level",
        skillLevelMin: "Min",

        resetTraining: "Reset training",
        resetSkill: "Reset skill",

        // PerkLegend
        selected: "Selected",
        partialSelected: "Partial",
        available: "Available",
        locked: "Locked",
        buildProblemLegend: "Problems",

        // Destiny points label (not used when not destiny)
        destinyPoints: "Destiny points",
      };
    }

    if (panelId === "character-setup") {
      return {
        title: "Character Setup",
        backToOverview: "Back",
      };
    }

    return {};
  },
}));

vi.mock("@/components/SkillIcon", () => ({
  SkillIcon: () => <div data-testid="skill-icon" />,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children }: { children: any }) => <button>{children}</button>,
}));

vi.mock("@/components/NumericLevelInput", () => ({
  NumericLevelInput: () => <div data-testid="numeric-level-input" />,
}));

vi.mock("@/components/PerkBadgeVisibilityDropdown", () => ({
  PerkBadgeVisibilityDropdown: () => <div data-testid="perk-badge-visibility-dropdown" />,
}));

vi.mock("@/components/ResetPerksButton", () => ({
  ResetPerksButton: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
}));

vi.mock("@/components/SkillTrainingSection", () => ({
  SkillTrainingSection: () => <div data-testid="skill-training-section" />,
}));

vi.mock("@/components/PerkTreeView", () => ({
  PerkTreeView: () => <div data-testid="perk-tree-view" />,
}));

vi.mock("@/components/ui/tooltip", () => ({
  HoverTapTooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/engine/buildEngine", async () => {
  const actual = await vi.importActual<typeof import("@/engine/buildEngine")>("@/engine/buildEngine");
  return {
    ...actual,
    getOrderedPerkTrees: () => [
      {
        skillId: "alchemy",
        skillName: "Alchemy",
        perks: [{ id: "p1" }],
      },
    ] as any,
    getBuildPlayerLevelWarnings: () => ({ perks: [], skillIncreases: [], destinyPerksOverBudget: [] }),
    getSelectedPerksBelowSkillRequirement: () => [],
    getStoredSkillLevel: () => 10,
    getStoredSkillTraining: () => 0,
    getTraitFloor: () => 0,
    isSkillOverPlayerLevelCap: () => false,
    getSkillFloor: () => 0,
    getSkillLevelFromTraining: () => 0,
    getMaxAllowedSkillLevel: () => 100,
    getMaxSkillLevel: () => 100,
    computeDestinyPerkPointsSpent: () => 0,
    getEarnedDestinyPerkPoints: () => 0,
    getRemainingDestinyPerkPoints: () => 0,
  };
});

import { createInitialBuildState, getOrderedPerkTrees } from "@/engine/buildEngine";
import { useBuildStore } from "@/store/buildStore";
import { useUiStore } from "@/store/uiStore";
import { SkillTreePanel } from "@/panels/SkillTreePanel";

describe("SkillTreePanel", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    useBuildStore.setState({
      gameData: { game: {} } as any,
      build: createInitialBuildState(),
      computed: { trainingLevelsRemaining: 0 } as any,
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

  it("keeps the skill tree header sticky while the pane scrolls", () => {
    act(() => {
      root!.render(createElement(SkillTreePanel));
    });

    const stickyEl = container?.querySelector(".sticky");
    expect(stickyEl).toBeTruthy();
    expect((stickyEl as HTMLElement).className).toContain("top-0");
  });

  it("hides training controls for supernatural perk trees", () => {
    vi.mocked(getOrderedPerkTrees).mockReturnValueOnce([
      {
        skillId: "vampire",
        skillName: "Vampire",
        perks: [{ id: "vampire-scion" }],
      },
    ] as any);

    useUiStore.setState({
      middleView: "skill-trees",
      activeSkillTreeId: "vampire",
      skillWorkspaceMode: "training",
    });

    act(() => {
      root!.render(createElement(SkillTreePanel));
    });

    expect(container?.textContent).not.toContain("Training");
    expect(container?.textContent).not.toContain("Skill Level");
    expect(container?.querySelector('[data-testid="skill-training-section"]')).toBeNull();
    expect(container?.querySelector('[data-testid="numeric-level-input"]')).toBeNull();
    expect(useUiStore.getState().skillWorkspaceMode).toBe("perks");
  });
});

