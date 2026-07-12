import { describe, expect, it } from "vitest";
import {
  getAuNaturelEmptyArmorSlots,
  getAuNaturelGearPenalty,
  getAuNaturelPerLevelAttributeBonus,
  getAuNaturelTotalAttributeBonus,
  parseAuNaturelGearPieces,
} from "@/lib/auNaturel";

describe("auNaturel helpers", () => {
  it("parses valid gear piece counts", () => {
    expect(parseAuNaturelGearPieces("0")).toBe(0);
    expect(parseAuNaturelGearPieces("4")).toBe(4);
  });

  it("rejects invalid gear piece counts", () => {
    expect(parseAuNaturelGearPieces("5")).toBeNull();
    expect(parseAuNaturelGearPieces("none")).toBeNull();
  });

  it("computes empty armor slots from equipped gear", () => {
    expect(getAuNaturelEmptyArmorSlots(0)).toBe(4);
    expect(getAuNaturelEmptyArmorSlots(4)).toBe(0);
    expect(getAuNaturelEmptyArmorSlots(2)).toBe(2);
  });

  it("grants +1 per missing gear piece per player level to each attribute", () => {
    expect(getAuNaturelPerLevelAttributeBonus(0, 10)).toBe(40);
    expect(getAuNaturelPerLevelAttributeBonus(4, 10)).toBe(0);
    expect(getAuNaturelPerLevelAttributeBonus(2, 25)).toBe(50);
  });

  it("applies -40 per equipped gear piece", () => {
    expect(getAuNaturelGearPenalty(0)).toBe(0);
    expect(getAuNaturelGearPenalty(1)).toBe(40);
    expect(getAuNaturelGearPenalty(4)).toBe(160);
  });

  it("combines per-level bonus and gear penalty", () => {
    expect(getAuNaturelTotalAttributeBonus(0, 10)).toBe(40);
    expect(getAuNaturelTotalAttributeBonus(4, 50)).toBe(-160);
    expect(getAuNaturelTotalAttributeBonus(2, 20)).toBe(-40);
  });
});
