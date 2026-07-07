import { describe, expect, it } from "vitest";
import mechanicsJson from "../../../data/game/mechanics.json";
import { mechanicsSchema } from "@/data/schemas";

describe("mechanicsSchema", () => {
  it("accepts bundled mechanics with standard max at or below max player level", () => {
    const result = mechanicsSchema.safeParse(mechanicsJson);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.leveling.maxPlayerLevel).toBe(201);
      expect(result.data.leveling.standardMaxPlayerLevel).toBe(101);
    }
  });

  it("rejects standardMaxPlayerLevel above maxPlayerLevel", () => {
    const invalid = {
      ...mechanicsJson,
      leveling: {
        ...mechanicsJson.leveling,
        maxPlayerLevel: 101,
        standardMaxPlayerLevel: 201,
      },
    };

    const result = mechanicsSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["leveling", "standardMaxPlayerLevel"],
            message: expect.stringContaining("must be <= maxPlayerLevel"),
          }),
        ]),
      );
    }
  });
});
