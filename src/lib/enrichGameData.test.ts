import { describe, expect, it } from "vitest";
import { enrichPerk } from "@/lib/enrichGameData";
import type { Perk } from "@/data/schemas";

describe("enrichPerk authoritative effects", () => {
  it("prefers committed effects over description text", () => {
    const perk: Perk = {
      id: "test-perk",
      name: "Test Perk",
      skillReq: 0,
      costsPerkPoint: true,
      position: { x: 0, y: 0 },
      prerequisites: [],
      description: "Prices are 99% better.",
      effects: [{ type: "derivedStat", stat: "priceModifier", value: 5, isPercent: true }],
    };

    const enriched = enrichPerk(perk);
    expect(enriched.effects).toEqual([
      { type: "derivedStat", stat: "priceModifier", value: 5, isPercent: true },
    ]);
  });

  it("skips parsing for extension perks", () => {
    const perk: Perk = {
      id: "speech-haggling",
      name: "Haggling",
      extension: "speech-haggling",
      skillReq: 0,
      costsPerkPoint: true,
      position: { x: 0, y: 0 },
      prerequisites: [],
      description: "Prices are 1% better per level in speech.",
      effects: [],
    };

    expect(enrichPerk(perk).effects).toEqual([]);
  });

  it("applies repeatable allocation from extension plugins when JSON omits it", () => {
    const perk: Perk = {
      id: "enchanting-artifact-enchanter",
      name: "Artifact Enchanter",
      extension: "enchanting-artifact-enchanter",
      skillReq: 100,
      costsPerkPoint: true,
      position: { x: 0, y: 0 },
      prerequisites: [],
      description: "With great skill and dedication...",
      effects: [],
    };

    expect(enrichPerk(perk).allocation).toEqual({
      kind: "perkPointsBudget",
      totalLabel: "infinity",
    });
  });
});
