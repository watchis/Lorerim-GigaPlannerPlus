import { describe, it, expect, beforeEach } from "vitest";

import { useUiStore } from "@/store/uiStore";

describe("uiStore", () => {
  beforeEach(() => {
    useUiStore.setState({
      perkBadgeVisibility: {
        playerLevelReq: true,
        skillLevelReq: true,
        perkName: false,
      },
    });
  });

  it("stores perk badge visibility as independent global toggles", () => {
    expect(useUiStore.getState().perkBadgeVisibility).toEqual({
      playerLevelReq: true,
      skillLevelReq: true,
      perkName: false,
    });

    useUiStore.getState().togglePerkBadgeVisibility("skillLevelReq");
    expect(useUiStore.getState().perkBadgeVisibility.skillLevelReq).toBe(false);
    expect(useUiStore.getState().perkBadgeVisibility.playerLevelReq).toBe(true);

    useUiStore.getState().setPerkBadgeVisibility({
      playerLevelReq: false,
      skillLevelReq: false,
      perkName: true,
    });
    expect(useUiStore.getState().perkBadgeVisibility).toEqual({
      playerLevelReq: false,
      skillLevelReq: false,
      perkName: true,
    });
  });

  it("forces perks mode when opening supernatural perk trees", () => {
    useUiStore.setState({ skillWorkspaceMode: "training" });
    useUiStore.getState().openSkillTree("vampire");
    expect(useUiStore.getState().skillWorkspaceMode).toBe("perks");
    expect(useUiStore.getState().activeSkillTreeId).toBe("vampire");
  });

  it("ignores training mode for supernatural perk trees", () => {
    useUiStore.setState({ activeSkillTreeId: "werewolf", skillWorkspaceMode: "perks" });
    useUiStore.getState().setSkillWorkspaceMode("training");
    expect(useUiStore.getState().skillWorkspaceMode).toBe("perks");
  });
});
