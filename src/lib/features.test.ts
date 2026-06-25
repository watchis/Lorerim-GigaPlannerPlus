import { describe, expect, it } from "vitest";
import { isConditionalBonusesEnabled } from "@/lib/features";

describe("isConditionalBonusesEnabled", () => {
  it("is off by default", () => {
    expect(isConditionalBonusesEnabled("")).toBe(false);
    expect(isConditionalBonusesEnabled("?build=abc")).toBe(false);
    expect(isConditionalBonusesEnabled("?conditionalBonuses=false")).toBe(false);
  });

  it("enables only when set to true", () => {
    expect(isConditionalBonusesEnabled("?conditionalBonuses=true")).toBe(true);
    expect(isConditionalBonusesEnabled("?build=abc&conditionalBonuses=true")).toBe(true);
    expect(isConditionalBonusesEnabled("?conditionalBonuses=TRUE")).toBe(true);
  });

  it("rejects other values", () => {
    expect(isConditionalBonusesEnabled("?conditionalBonuses=1")).toBe(false);
    expect(isConditionalBonusesEnabled("?conditionalBonuses=0")).toBe(false);
    expect(isConditionalBonusesEnabled("?conditionalBonuses=yes")).toBe(false);
    expect(isConditionalBonusesEnabled("?conditionalBonuses=")).toBe(false);
  });
});
