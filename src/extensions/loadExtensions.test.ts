import { describe, expect, it } from "vitest";
import { loadAppData } from "@/data/loader";
import {
  getCharacterOptionExtensions,
  getPerkExtensions,
} from "@/extensions/loadExtensions";

describe("loadExtensions", () => {
  it("discovers character-option and perk extensions referenced in game data", () => {
    loadAppData();

    expect(getCharacterOptionExtensions().has("oghma-infinium")).toBe(true);
    expect(getPerkExtensions().has("speech-haggling")).toBe(true);
    expect(getPerkExtensions().has("enchanting-artifact-enchanter")).toBe(true);
  });
});
