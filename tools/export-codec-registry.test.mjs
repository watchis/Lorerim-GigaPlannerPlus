import test from "node:test";
import assert from "node:assert/strict";
import { exportCodecRegistryFromPaths } from "../export-codec-registry.mjs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

test("exportCodecRegistryFromPaths captures ordered perk ids for the current game data", () => {
  const snapshot = exportCodecRegistryFromPaths({ game: join(root, "data", "game") });

  assert.equal(snapshot.version, "5.0.4.2");
  assert.ok(snapshot.perks.length > 100);
  assert.ok(snapshot.skills.includes("block"));
  assert.ok(snapshot.perks.includes("block-improved-blocking"));
});
