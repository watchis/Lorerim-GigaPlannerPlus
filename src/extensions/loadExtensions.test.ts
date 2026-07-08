import { describe, expect, it } from "vitest";
import { build } from "vite";
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

  it("includes extension modules in the production bundle", async () => {
    const result = await build({
      configFile: "./vite.config.ts",
      build: { write: false, minify: false, rollupOptions: { input: "./src/main.tsx" } },
      logLevel: "silent",
    });
    const outputs = Array.isArray(result) ? result[0].output : result.output;
    const chunk = outputs.find(
      (file) => file.type === "chunk" && file.code.includes("characterOptionModules"),
    );

    expect(chunk?.code).toBeDefined();
    expect(chunk?.code).not.toContain("characterOptionModules = /* #__PURE__ */ Object.assign({})");
    expect(chunk?.code).toContain("oghma-infinium.ts");
    expect(chunk?.code).toContain("speech-haggling.ts");
    expect(chunk?.code).not.toContain("oghma-infinium.test.ts");
  });
});
