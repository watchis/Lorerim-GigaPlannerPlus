import { describe, expect, it } from "vitest";
import { trimBonusClauses } from "@/lib/trimBonusClause";

describe("trimBonusClauses", () => {
  it("splits on however/but and capitalizes clauses", () => {
    expect(trimBonusClauses("gain 10% damage, however lose 5% armor")).toEqual([
      "Gain 10% damage.",
      "Lose 5% armor.",
    ]);
  });

  it("returns an empty array for blank input", () => {
    expect(trimBonusClauses("")).toEqual([]);
    expect(trimBonusClauses("   ")).toEqual([]);
  });

  it("preserves trailing periods", () => {
    expect(trimBonusClauses("Spells are stronger")).toEqual(["Spells are stronger."]);
  });
});
