import { describe, expect, it } from "vitest";
import { decodeCharacterOptionChoices } from "@/engine/legacyCharacterOptionCodec";

describe("legacyCharacterOptionCodec", () => {
  it("decodes id-based character option entries", () => {
    expect(
      decodeCharacterOptionChoices(
        [
          ["au-naturel-gear", "3"],
          ["alduin-bonus-trait", "claimed"],
        ],
        "5.0.4.2",
      ),
    ).toEqual({
      "au-naturel-gear": "3",
      "alduin-bonus-trait": "claimed",
    });
  });

  it("decodes legacy v2 index entries using frozen tables", () => {
    expect(
      decodeCharacterOptionChoices([[1, 1]], "5.0.3.6"),
    ).toEqual({
      "alduin-bonus-trait": "claimed",
    });
  });

  it("does not map legacy indices through current game data ordering", () => {
    expect(
      decodeCharacterOptionChoices([[2, 3]], "5.0.4.2"),
    ).toEqual({
      "au-naturel-gear": "3",
    });
  });
});
