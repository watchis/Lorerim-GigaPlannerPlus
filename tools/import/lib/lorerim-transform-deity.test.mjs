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
    edid: "WSN_AltarBlessing_Daedra_Hircine_Spell",
    name: "Hircine's Blessing",
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
    effectDescription: "Increases your Health and Stamina by <mag> points.",
  },
  {
    edid: "WSN_AltarBlessing_Daedra_Hircine_Effect",
    effectDescription: "Regenerate Stamina <mag>% faster.",
  },
  {
    edid: "WSN_AltarBlessing_Tribunal_SothaSil_Effect",
    effectDescription: "Increases your Health and Magicka by <mag> points.",
  },
  {
    edid: "WSN_AltarBlessing_Tribunal_Vivec_Effect",
    effectDescription: "Increases your Magicka and Stamina by <mag> points.",
  },
  {
    edid: "WSN_Tribunal_Almalexia_Boon1_Effect_Ab",
    effectDescription:
      "Take up to 20% less damage from attacks/spells when blocking. Deal up to 20% more damage to enemies who are directly facing you.",
  },
  {
    edid: "WSN_Tribunal_Almalexia_Boon2_Effect_Ab",
    effectDescription:
      "Healing from most sources is increased by up to 20%. Wards are up to 30% cheaper to cast.",
  },
  {
    edid: "WSN_Tribunal_SothaSil_Boon1_Effect_Ab",
    effectDescription: "Enchanting is up to 15% stronger. Up to 20% stronger wind and telekenetic spells.",
  },
  {
    edid: "WSN_Tribunal_Vivec_Boon1_Effect_Ab",
    effectDescription: "Speech and intimidation is up to 60% easier. Light melee attacks deal up to 30% more damage.",
  },
];

const result = transformDeityRecords(spellRecords, mgefRecords, mesgRecords, deitiesPath, new Map([
  ["Tribunal_Almalexia", { magnitude: 15 }],
  ["Daedra_Hircine", { magnitude: 25 }],
  ["Tribunal_SothaSil", { magnitude: 15 }],
  ["Tribunal_Vivec", { magnitude: 15 }],
]));
const byId = new Map(result.deities.map((deity) => [deity.id, deity]));

assert.ok(byId.has("almalexia"), "expected Almalexia to import from worship MESG");
assert.ok(byId.has("sotha-sil"), "expected Sotha Sil to import from worship MESG");
assert.ok(byId.has("vivec"), "expected Vivec to import from worship MESG");

assert.equal(byId.get("almalexia")?.name, "Almalexia");
assert.equal(byId.get("sotha-sil")?.name, "Sotha Sil");
assert.equal(byId.get("vivec")?.name, "Vivec");
assert.equal(
  byId.get("almalexia")?.shrine,
  "Increases your Health and Stamina by 15 points.",
);
assert.equal(byId.get("hircine")?.shrine, "Regenerate Stamina 25% faster.");
assert.match(byId.get("almalexia")?.follower ?? "", /blocking/i);
assert.match(byId.get("almalexia")?.devotee ?? "", /Healing from most sources/i);
assert.match(byId.get("almalexia")?.tenets ?? "", /beggars and children/);

const emptyFaithPath = join(tempDir, "deities-empty.json");
writeFileSync(emptyFaithPath, JSON.stringify({ deities: [{ id: "none", name: "None" }] }));
const emptyFaith = transformDeityRecords(
  [],
  [],
  [
    {
      edid: "WSN_WorshipRequest_Message_EmptyFaith",
      description: "Pray to Empty.\n\nTenets: Do nothing useful.",
    },
  ],
  emptyFaithPath,
);
assert.equal(
  emptyFaith.deities.filter((deity) => deity.id !== "none").length,
  0,
  "deities without shrine/follower/devotee values are not imported",
);

console.log("lorerim-transform-deity tests passed");
