import { gzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import type { CharacterOption } from "@/data/schemas";
import { decodeBuild, decodeBuildPackage, encodeBuild } from "@/engine/buildCodec";
import { createTestBuildState, getTestGameData } from "@/test/helpers";
import type { BuildState } from "@/engine/buildEngine";

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function buildStateForCharacterOptionChoice(
  option: CharacterOption,
  choiceId: string,
): BuildState {
  const overrides: Partial<BuildState> = {
    characterOptionChoices: { [option.id]: choiceId },
  };

  if (option.id === "au-naturel-gear") {
    overrides.traitIds = ["au-naturel"];
  }

  if (option.id === "oghma-infinium" && choiceId === "claimed") {
    overrides.oghmaSkillIds = ["block", "smithing"];
  }

  return createTestBuildState(overrides);
}

function expectedChoiceAfterRoundTrip(option: CharacterOption, choiceId: string): string {
  if (option.id === "oghma-infinium") {
    if (choiceId === "none") return "none";
    return "claimed";
  }
  return choiceId;
}

describe("character option codec coverage", () => {
  const game = getTestGameData();

  it("round-trips every non-default choice for each character option", () => {
    for (const option of game.characterOptions) {
      for (const choice of option.choices) {
        if (choice.id === option.defaultChoice) continue;

        const state = buildStateForCharacterOptionChoice(option, choice.id);
        const decoded = decodeBuild(encodeBuild(state, game), game);

        expect(decoded.characterOptionChoices[option.id]).toBe(
          expectedChoiceAfterRoundTrip(option, choice.id),
        );

        if (option.id === "oghma-infinium" && choice.id === "claimed") {
          expect(decoded.oghmaSkillIds).toEqual(["block", "smithing"]);
        }
      }
    }
  });

  it("round-trips all character options together in one build", () => {
    const state = createTestBuildState({
      traitIds: ["au-naturel"],
      characterOptionChoices: {
        "oghma-infinium": "claimed",
        "alduin-bonus-trait": "claimed",
        "au-naturel-gear": "2",
      },
      oghmaSkillIds: ["block", "smithing"],
    });

    const decoded = decodeBuild(encodeBuild(state, game), game);

    expect(decoded.characterOptionChoices).toEqual({
      "oghma-infinium": "claimed",
      "alduin-bonus-trait": "claimed",
      "au-naturel-gear": "2",
      vampire: "none",
      werewolf: "none",
      lich: "none",
    });
    expect(decoded.oghmaSkillIds).toEqual(["block", "smithing"]);
  });

  it("restores default choices when no character options are encoded", () => {
    const decoded = decodeBuild(encodeBuild(createTestBuildState(), game), game);

    expect(decoded.characterOptionChoices).toEqual({
      "oghma-infinium": "none",
      "alduin-bonus-trait": "none",
      "au-naturel-gear": "0",
      vampire: "none",
      werewolf: "none",
      lich: "none",
    });
  });

  it("decodes legacy v2 Oghma index choices", () => {
    for (const [mv, optionIndex, choiceIndex, expectedOghma] of [
      ["5.0.3.6", 0, 1, "claimed"],
      ["5.0.4.2", 0, 1, "claimed"],
    ] as const) {
      const payload = {
        v: 2 as const,
        mv,
        co: [[optionIndex, choiceIndex]] as [number, number][],
      };
      const compressed = gzipSync(new TextEncoder().encode(JSON.stringify(payload)));
      const code = `2.${toBase64Url(compressed)}`;

      const decoded = decodeBuildPackage(code, game);

      expect(decoded.build.characterOptionChoices["oghma-infinium"]).toBe(expectedOghma);
    }
  });

  it("decodes legacy v2 Oghma health path into warrior skills", () => {
    const payload = {
      v: 2 as const,
      mv: "5.0.3.6",
      co: [[0, 1]] as [number, number][],
    };
    const compressed = gzipSync(new TextEncoder().encode(JSON.stringify(payload)));
    const code = `2.${toBase64Url(compressed)}`;

    const decoded = decodeBuildPackage(code, game);

    expect(decoded.build.characterOptionChoices["oghma-infinium"]).toBe("claimed");
    expect(decoded.build.oghmaSkillIds).toEqual([
      "one-handed",
      "two-handed",
      "block",
      "heavy-armor",
      "smithing",
      "enchanting",
    ]);
  });
});
