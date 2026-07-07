import { describe, it, expect, beforeEach } from "vitest";

import { useUiStore } from "@/store/uiStore";

describe("uiStore", () => {
  beforeEach(() => {
    // Reset relevant UI state between tests (zustand store is a singleton).
    useUiStore.setState({ showPerkSkillRequirements: true });
  });

  it("stores perk skill requirements visibility as a single global flag", () => {
    expect(useUiStore.getState().showPerkSkillRequirements).toBe(true);

    useUiStore.getState().setShowPerkSkillRequirements(false);
    expect(useUiStore.getState().showPerkSkillRequirements).toBe(false);

    useUiStore.getState().setShowPerkSkillRequirements(true);
    expect(useUiStore.getState().showPerkSkillRequirements).toBe(true);
  });
});

