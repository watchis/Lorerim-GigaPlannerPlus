import { describe, expect, it } from "vitest";
import {
  formatPerkNodeRequirementLabel,
  getPerkNodeRequirements,
} from "@/lib/perkRequirements";
import type { Perk } from "@/data/schemas";

function makePerk(overrides: Partial<Perk> = {}): Perk {
  return {
    id: "test-perk",
    name: "Test Perk",
    skillReq: 0,
    position: { x: 0, y: 0 },
    prerequisites: [],
    description: "Test",
    effects: [],
    costsPerkPoint: true,
    ...overrides,
  };
}

describe("perkRequirements", () => {
  it("returns null requirements for ungated perks", () => {
    expect(getPerkNodeRequirements(makePerk())).toEqual({
      skillReq: null,
      playerLevelReq: null,
    });
    expect(formatPerkNodeRequirementLabel(getPerkNodeRequirements(makePerk()))).toBeNull();
  });

  it("formats combined skill and player level requirements", () => {
    const requirements = getPerkNodeRequirements(
      makePerk({ skillReq: 50, playerLevelReq: 10 }),
    );

    expect(requirements).toEqual({ skillReq: 50, playerLevelReq: 10 });
    expect(formatPerkNodeRequirementLabel(requirements)).toBe("Lv 10 · 50");
  });

  it("formats requirement parts based on visibility toggles", () => {
    const requirements = getPerkNodeRequirements(
      makePerk({ skillReq: 50, playerLevelReq: 10 }),
    );

    expect(
      formatPerkNodeRequirementLabel(requirements, {
        visibility: {
          playerLevelReq: true,
          skillLevelReq: false,
          perkName: false,
        },
      }),
    ).toBe("Lv 10");
    expect(
      formatPerkNodeRequirementLabel(requirements, {
        visibility: {
          playerLevelReq: false,
          skillLevelReq: true,
          perkName: true,
        },
        perkName: "Stealth Archer",
      }),
    ).toBe("Stealth Archer · 50");
    expect(
      formatPerkNodeRequirementLabel(requirements, {
        visibility: {
          playerLevelReq: false,
          skillLevelReq: false,
          perkName: true,
        },
        perkName: "Stealth Archer",
      }),
    ).toBe("Stealth Archer");
  });

  it("treats level 1 player requirements as ungated", () => {
    const requirements = getPerkNodeRequirements(makePerk({ playerLevelReq: 1 }));
    expect(requirements).toEqual({ skillReq: null, playerLevelReq: null });
    expect(formatPerkNodeRequirementLabel(requirements)).toBeNull();
  });
});
