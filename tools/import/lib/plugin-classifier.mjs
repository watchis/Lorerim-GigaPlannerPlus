import { open } from "node:fs/promises";
import { visitAsync } from "./plugin-io.mjs";

/** Record types that affect planner mechanics (not textures, meshes, or audio). */
export const MECHANICS_RECORD_TYPES = new Set([
  "PERK",
  "SPEL",
  "RACE",
  "MESG",
  "QUST",
  "AVIF",
  "FLST",
  "MGEF",
  "WEAP",
  "ARMO",
  "ENCH",
  "KYWD",
]);

/**
 * Quick header scan: true when the plugin contains any mechanics-relevant records.
 */
export async function classifyPluginMechanics(pluginPath) {
  const fh = await open(pluginPath, "r");
  try {
    const offsets = await visitAsync(fh.fd);
    const recordTypes = new Set();

    for (const [, type] of offsets) {
      if (MECHANICS_RECORD_TYPES.has(type)) {
        recordTypes.add(type);
      }
    }

    return {
      hasMechanics: recordTypes.size > 0,
      recordTypes: [...recordTypes].sort(),
    };
  } finally {
    await fh.close();
  }
}
