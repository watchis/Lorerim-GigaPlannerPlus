import { discoverInstall } from "./lib/lorerim-install.mjs";
import * as tesData from "@fcrick/tes-data";
import { open } from "node:fs/promises";
import { SKILL_IDS, SKILL_NAMES } from "./lib/skill-constants.mjs";
import { cleanName } from "./lib/transform-utils.mjs";

const AVIF_SKILL_ALIASES = new Map([
  ["mysticism", "illusion"],
  ["pickpocket", "finesse"],
  ["speechcraft", "speech"],
  ["lightarmor", "evasion"],
  ["marksmanship", "marksman"],
  ["onehanded", "one-handed"],
  ["twohanded", "two-handed"],
  ["heavyarmor", "heavy-armor"],
]);

function skillIdFromAvif(edid, fullName) {
  const normalizedFull = cleanName(fullName).toLowerCase();
  const fullIndex = SKILL_NAMES.findIndex((name) => name.toLowerCase() === normalizedFull);
  if (fullIndex >= 0) return SKILL_IDS[fullIndex];
  const body = String(edid ?? "").replace(/^AV/, "").toLowerCase();
  return AVIF_SKILL_ALIASES.get(body) ?? null;
}

const install = discoverInstall(process.argv[2] ?? "D:/Wabbajack/Modlists/Lorerim");
const winners = new Map();

for (const { pluginName, path } of install.plugins) {
  const fh = await open(path, "r");
  const offsets = await new Promise((resolve) => {
    const list = [];
    tesData.visit(fh.fd, {
      visitOffset(offset, type) {
        list.push([offset, type]);
      },
      done() {
        resolve(list);
      },
    });
  });

  for (const [offset, type] of offsets) {
    if (type !== "AVIF") continue;
    try {
      const buffer = await new Promise((resolve, reject) => {
        tesData.getRecordBuffer(fh.fd, offset, (err, data) => (err ? reject(err) : resolve(data)));
      });
      const record = tesData.getRecord(buffer);
      if (record.compressed) continue;
      const edid = record.subRecords?.find((sub) => sub.type === "EDID")?.value;
      const fullName = record.subRecords?.find((sub) => sub.type === "FULL")?.value ?? "";
      const skillId = skillIdFromAvif(edid, fullName);
      if (!skillId) continue;
      winners.set(skillId, { pluginName, modName: install.plugins.find((p) => p.pluginName === pluginName)?.modName, avifEdid: edid, sections: (buffer.toString("binary").match(/PNAM/g) ?? []).length });
    } catch {
      // skip
    }
  }
  await fh.close();
}

console.log(JSON.stringify({ skills: Object.fromEntries(winners) }, null, 2));
