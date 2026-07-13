import { describe, expect, it } from "vitest";
import {
  formatLichPerSoulSummary,
  formatLichPhylacteryNextUnlockSubtitle,
  getLichPerSoulEffects,
  getLichPhylactery,
  getNextLichThreshold,
  getUnlockedLichThresholds,
  parseLichSoulCount,
} from "@/lib/lichPhylactery";
import { getTestGameData } from "@/test/helpers";

describe("lichPhylactery", () => {
  const game = getTestGameData();
  const phylactery = getLichPhylactery(game);

  it("defines max 50 souls and Classical Lichdom per-soul rates", () => {
    expect(phylactery.maxSouls).toBe(50);
    expect(phylactery.perSoul).toEqual({
      armorRating: 2,
      magicka: 4,
      magicAbsorb: 0.5,
      magicAbsorbInForm: 0.5,
      spellDurationInForm: 0.5,
    });
  });

  it("documents Magicka Flood and Lich Barrier as the early unlocks that grant per-soul scaling", () => {
    const flood = phylactery.thresholds.find((entry) => entry.souls === 1);
    const barrier = phylactery.thresholds.find((entry) => entry.souls === 2);
    expect(flood).toMatchObject({
      name: "Magicka Flood",
      effects: [{ type: "attribute", stat: "magicka", value: 50 }],
    });
    expect(flood?.description).toContain("additional 4 magicka");
    expect(flood?.description).toContain("0.5% longer");
    expect(barrier).toMatchObject({ name: "Lich Barrier" });
    expect(barrier?.description).toContain("2 armor rating");
    expect(barrier?.description).toContain("0.5% spell absorption");
    expect(barrier?.description).toContain("additional 0.5% in lich form");
  });

  it("parses soul choice ids including legacy claimed", () => {
    expect(parseLichSoulCount("claimed", 50)).toBe(0);
    expect(parseLichSoulCount("0", 50)).toBe(0);
    expect(parseLichSoulCount("50", 50)).toBe(50);
    expect(parseLichSoulCount("51", 50)).toBeNull();
    expect(parseLichSoulCount("none", 50)).toBeNull();
  });

  it("unlocks Classical Lichdom thresholds at the documented soul counts", () => {
    const unlocked = getUnlockedLichThresholds(phylactery, 25).map((entry) => entry.souls);
    expect(unlocked).toEqual([1, 2, 3, 5, 8, 10, 12, 15, 18, 20, 22, 25]);
    expect(getNextLichThreshold(phylactery, 25)?.souls).toBe(30);
    expect(getUnlockedLichThresholds(phylactery, 50)).toHaveLength(phylactery.thresholds.length);
  });

  it("applies Magicka Flood scaling only after 1 soul and Barrier after 2", () => {
    expect(getLichPerSoulEffects(phylactery, 0)).toEqual([]);
    expect(getLichPerSoulEffects(phylactery, 1)).toEqual([
      { type: "attribute", stat: "magicka", value: 4 },
    ]);
    expect(getLichPerSoulEffects(phylactery, 10)).toEqual([
      { type: "derivedStat", stat: "armorRating", value: 20 },
      { type: "attribute", stat: "magicka", value: 40 },
      { type: "derivedStat", stat: "magicAbsorb", value: 5, isPercent: true },
    ]);
  });

  it("formats next-unlock subtitle for the Phylactery strip", () => {
    expect(formatLichPhylacteryNextUnlockSubtitle(phylactery, 8)).toBe(
      "Next unlock at 10 souls: Improved Physical Form",
    );
    expect(formatLichPhylacteryNextUnlockSubtitle(phylactery, 50)).toBeNull();
  });

  it("formats form-gated per-soul bonuses after their unlocks", () => {
    expect(formatLichPerSoulSummary(phylactery, 1)).toEqual([
      "+4 magicka",
      "+0.5% spell duration in lich form",
    ]);
    expect(formatLichPerSoulSummary(phylactery, 10)).toEqual([
      "+40 magicka",
      "+5% spell duration in lich form",
      "+20 armor rating",
      "+5% magic absorb chance",
      "+5% magic absorb chance in lich form",
    ]);
  });
});
