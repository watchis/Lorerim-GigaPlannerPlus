import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getPerkExtension } from "@/extensions/loadExtensions";

interface ExtensionBindingsFile {
  perks: Array<{
    skillId: string;
    name: string;
    extension: string;
    allocation?: { kind: "perkPointsBudget"; totalLabel?: "X" | "infinity" };
  }>;
}

describe("extension-bindings sync", () => {
  it("keeps repeatable allocation in sync between bindings and perk extensions", () => {
    const bindings = JSON.parse(
      readFileSync(join(process.cwd(), "data/game/extension-bindings.json"), "utf8"),
    ) as ExtensionBindingsFile;

    for (const binding of bindings.perks) {
      if (!binding.allocation) continue;

      const extension = getPerkExtension(binding.extension);
      expect(extension, `missing extension module for ${binding.extension}`).toBeDefined();
      expect(extension?.allocation).toEqual(binding.allocation);
    }
  });
});
