import * as tesData from "@fcrick/tes-data";
import { open } from "node:fs/promises";

const path = process.argv[2];
const typeFilter = process.argv[3] ?? "PERK";

if (!path) {
  console.error("Usage: node tools/import/probe-esp.mjs <plugin.esp> [PERK|RACE]");
  process.exit(1);
}

function getRecordBufferAsync(fd, offset) {
  return new Promise((resolve, reject) => {
    tesData.getRecordBuffer(fd, offset, (err, buffer) => (err ? reject(err) : resolve(buffer)));
  });
}

function visitAsync(fd) {
  const offsets = [];
  return new Promise((resolve) => {
    tesData.visit(fd, {
      visitOffset(offset, type) {
        offsets.push([offset, type]);
      },
      done() {
        resolve(offsets);
      },
    });
  });
}

const fh = await open(path, "r");
const offsets = await visitAsync(fh.fd);
const perks = [];
const races = [];
let compressed = 0;

for (const [offset, type] of offsets) {
  if (type !== typeFilter) continue;
  const buffer = await getRecordBufferAsync(fh.fd, offset);
  const record = tesData.getRecord(buffer);
  if (record.compressed) {
    compressed += 1;
    continue;
  }

  const edid = record.subRecords?.find((sub) => sub.type === "EDID")?.value;
  if (!edid) continue;

  if (typeFilter === "RACE") {
    const full = record.subRecords?.find((sub) => sub.type === "FULL")?.value;
    races.push({ edid, full });
    continue;
  }

  const full = record.subRecords?.find((sub) => sub.type === "FULL")?.value;
  const desc = record.subRecords?.find((sub) => sub.type === "DESC")?.value;
  perks.push({
    edid,
    full,
    desc: typeof desc === "string" ? desc.slice(0, 100) : desc,
  });
}

const payload =
  typeFilter === "RACE"
    ? {
        totalRecords: offsets.length,
        raceRecords: offsets.filter(([, type]) => type === "RACE").length,
        compressed,
        races: races.length,
        sample: races.slice(0, 12),
      }
    : {
        totalRecords: offsets.length,
        perkRecords: offsets.filter(([, type]) => type === "PERK").length,
        compressed,
        perks: perks.length,
        sample: perks.slice(0, 12),
      };

console.log(JSON.stringify(payload, null, 2));

await fh.close();
