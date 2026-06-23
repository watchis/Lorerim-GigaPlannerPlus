import * as tesData from "@fcrick/tes-data";
import { open } from "node:fs/promises";

const path = process.argv[2];
const edids = new Set((process.argv[3] ?? "OrcRace,NordRace").split(","));

if (!path) {
  console.error("Usage: node tools/import/probe-race-data.mjs <plugin.esp> [edids]");
  process.exit(1);
}

function getBuf(fd, offset) {
  return new Promise((res, rej) => tesData.getRecordBuffer(fd, offset, (e, b) => (e ? rej(e) : res(b))));
}

const fh = await open(path, "r");
const offsets = await new Promise((res) => {
  const o = [];
  tesData.visit(fh.fd, {
    visitOffset(off, t) {
      o.push([off, t]);
    },
    done() {
      res(o);
    },
  });
});

for (const [off, type] of offsets) {
  if (type !== "RACE") continue;
  const buf = await getBuf(fh.fd, off);
  const rec = tesData.getRecord(buf);
  const edid = rec.subRecords?.find((s) => s.type === "EDID")?.value;
  if (!edids.has(edid)) continue;

  const dataSub = rec.subRecords?.find((s) => s.type === "DATA");
  const bytes = Buffer.isBuffer(dataSub?.value)
    ? dataSub.value
    : Buffer.from(dataSub?.value ?? []);

  const floats = [];
  for (let o = 0; o + 4 <= bytes.length; o += 4) {
    const f = bytes.readFloatLE(o);
    if (f > 0.05 && f < 500 && Number.isFinite(f)) floats.push({ offset: o, value: f });
  }

  console.log(
    JSON.stringify(
      {
        edid,
        dataLength: bytes.length,
        header: [...bytes.slice(0, 16)],
        skillBytes: [...bytes.slice(2, 14)],
        floats,
      },
      null,
      2,
    ),
  );
}

await fh.close();
