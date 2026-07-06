import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { transformDeityRecords } from "./lorerim-transform.mjs";

const tempDir = mkdtempSync(join(tmpdir(), "deity-import-"));
const deitiesPath = join(tempDir, "deities.json");
writeFileSync(deitiesPath, JSON.stringify({ deities: [{ id: "none", name: "None" }] }));

const mesgRecords = [
  {
    edid: "WSN_WorshipRequest_Message_Tribunal_Almalexia",
    description:
      "Pray to Almalexia.\n\nFollower: Block better.\n\nTenets: Be generous to beggars and children.",
  },
  {
    edid: "WSN_WorshipRequest_Message_Tribunal_SothaSil",
    description:
      "Pray to Sotha Sil.\n\nFollower: Stronger enchanting.\n\nTenets: Uncover Dwemer secrets.",
  },
  {
    edid: "WSN_WorshipRequest_Message_Tribunal_Vivec",
    description:
      "Pray to Vivec.\n\nFollower: Easier speech checks.\n\nTenets: Fulfill your destiny.",
  },
];

const spellRecords = [
  {
    edid: "WSN_AltarBlessing_Tribunal_Almalexia_BuffOnly_Spell",
    name: "Lady's Grace",
    description: "",
  },
  {
    edid: "WSN_AltarBlessing_Tribunal_SothaSil_Spell",
    name: "Soul of Sotha Sil",
    description: "",
  },
  {
    edid: "WSN_AltarBlessing_Tribunal_Vivec_Spell",
    name: "Vivec's Mystery",
    description: "",
  },
];

const mgefRecords = [
  {
    edid: "WSN_AltarBlessing_Tribunal_Almalexia_Effect",
    effectDescription: "+15 Health and Stamina",
  },
  {
    edid: "WSN_AltarBlessing_Tribunal_SothaSil_Effect",
    effectDescription: "+15 Health and Magicka",
  },
  {
    edid: "WSN_AltarBlessing_Tribunal_Vivec_Effect",
    effectDescription: "+15 Stamina and Magicka",
  },
  {
    edid: "WSN_Tribunal_Almalexia_Boon1_Effect_Ab",
    effectDescription: "Take less damage while blocking",
  },
  {
    edid: "WSN_Tribunal_SothaSil_Boon1_Effect_Ab",
    effectDescription: "Enchanting is stronger",
  },
  {
    edid: "WSN_Tribunal_Vivec_Boon1_Effect_Ab",
    effectDescription: "Speech is easier",
  },
];

const result = transformDeityRecords(spellRecords, mgefRecords, mesgRecords, deitiesPath);
const byId = new Map(result.deities.map((deity) => [deity.id, deity]));

assert.ok(byId.has("almalexia"), "expected Almalexia to import from worship MESG");
assert.ok(byId.has("sotha-sil"), "expected Sotha Sil to import from worship MESG");
assert.ok(byId.has("vivec"), "expected Vivec to import from worship MESG");

assert.equal(byId.get("almalexia")?.name, "Almalexia");
assert.equal(byId.get("sotha-sil")?.name, "Sotha Sil");
assert.equal(byId.get("vivec")?.name, "Vivec");
assert.match(byId.get("almalexia")?.shrine ?? "", /Health and Stamina/);
assert.match(byId.get("almalexia")?.tenets ?? "", /beggars and children/);

console.log("lorerim-transform-deity tests passed");
