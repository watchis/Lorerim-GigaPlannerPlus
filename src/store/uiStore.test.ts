import { describe, it, expect, beforeEach } from "vitest";

import { useUiStore } from "@/store/uiStore";

describe("uiStore", () => {
  beforeEach(() => {
    useUiStore.setState({
      perkBadgeVisibility: {
        playerLevelReq: true,
        skillLevelReq: true,
        skillName: false,
      },
    });
  });

  it("stores perk badge visibility as independent global toggles", () => {
    expect(useUiStore.getState().perkBadgeVisibility).toEqual({
      playerLevelReq: true,
      skillLevelReq: true,
      skillName: false,
    });

    useUiStore.getState().togglePerkBadgeVisibility("skillLevelReq");
    expect(useUiStore.getState().perkBadgeVisibility.skillLevelReq).toBe(false);
    expect(useUiStore.getState().perkBadgeVisibility.playerLevelReq).toBe(true);

    useUiStore.getState().setPerkBadgeVisibility({
      playerLevelReq: false,
      skillLevelReq: false,
      skillName: true,
    });
    expect(useUiStore.getState().perkBadgeVisibility).toEqual({
      playerLevelReq: false,
      skillLevelReq: false,
      skillName: true,
    });
  });
});
