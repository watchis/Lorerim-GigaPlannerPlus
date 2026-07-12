import { describe, expect, it } from "vitest";
import { createExportedBuild, parseExportedBuild } from "@/lib/buildIO";
import { reconcileImportedBuild } from "@/engine/buildEngine";
import { createTestBuildState, getTestGameData } from "@/test/helpers";

describe("buildIO supernatural backup export", () => {
  const game = getTestGameData();

  it("round-trips vampire and werewolf choices through JSON backup files", () => {
    const build = createTestBuildState({
      characterOptionChoices: { vampire: "stage-4", werewolf: "none" },
      selectedPerkIds: ["vampire-scion"],
      description: "Vampire backup",
    });

    const exported = createExportedBuild("Vampire build", build, game.manifest.version);
    const parsed = parseExportedBuild(exported);
    const imported = reconcileImportedBuild(game, parsed.build);

    expect(imported.characterOptionChoices.vampire).toBe("stage-4");
    expect(imported.characterOptionChoices.werewolf).toBe("none");
    expect(imported.selectedPerkIds).toEqual(["vampire-scion"]);
    expect(imported.description).toBe("Vampire backup");
  });

  it("migrates legacy supernatural fields from JSON backups", () => {
    const legacy = createTestBuildState() as ReturnType<typeof createTestBuildState> & {
      lycanthropyId: string;
    };
    legacy.lycanthropyId = "claimed";

    const exported = createExportedBuild("Werewolf build", legacy, game.manifest.version);
    const imported = reconcileImportedBuild(game, parseExportedBuild(exported).build);

    expect(imported.characterOptionChoices.werewolf).toBe("claimed");
    expect(imported.characterOptionChoices.vampire).toBe("none");
  });
});
