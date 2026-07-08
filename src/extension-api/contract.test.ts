import { describe, expect, it } from "vitest";
import { defineCharacterOption, definePerk, scaleDerivedStatBySkillLevel } from "@/extension-api";

describe("extension-api contract", () => {
  it("exposes define helpers and scaling helper", () => {
    const option = defineCharacterOption({
      id: "test-option",
      getModifications: () => [],
    });
    const perk = definePerk({
      id: "test-perk",
      getModifications: () => [],
    });
    const effect = scaleDerivedStatBySkillLevel("priceModifier", 25, 1, { isPercent: true });

    expect(option.id).toBe("test-option");
    expect(perk.id).toBe("test-perk");
    expect(effect).toEqual({
      type: "derivedStat",
      stat: "priceModifier",
      value: 25,
      isPercent: true,
    });
  });
});
