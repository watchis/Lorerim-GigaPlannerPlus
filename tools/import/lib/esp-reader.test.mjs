import assert from "node:assert/strict";
import { readSpellEfitMagnitudes, readSpellMagnitudesForFormIds } from "./spell-magnitude.mjs";
import { collectAltarBlessingFromSpellBuffer, collectBoonFromSpellBuffer } from "./esp-reader.mjs";

function buildSpellEfitBuffer(magnitude, dataSize = 12) {
  const data = Buffer.alloc(dataSize);
  data.writeFloatLE(magnitude, 0);
  if (dataSize >= 8) data.writeUInt32LE(0, 4);
  if (dataSize >= 12) data.writeUInt32LE(0, 8);

  const header = Buffer.alloc(6);
  header.write("EFIT", 0, 4, "ascii");
  header.writeUInt16LE(dataSize, 4);
  return Buffer.concat([header, data]);
}

function buildSpellEfidBuffer(formId) {
  const data = Buffer.alloc(4);
  data.writeUInt32LE(formId, 0);
  const header = Buffer.alloc(6);
  header.write("EFID", 0, 4, "ascii");
  header.writeUInt16LE(4, 4);
  return Buffer.concat([header, data]);
}

assert.deepEqual(readSpellEfitMagnitudes(buildSpellEfitBuffer(15)), [15]);
assert.deepEqual(readSpellEfitMagnitudes(buildSpellEfitBuffer(25)), [25]);

assert.deepEqual(
  readSpellEfitMagnitudes(
    Buffer.concat([
      Buffer.from("SPEL\x00\x00", "ascii"),
      buildSpellEfitBuffer(0),
      buildSpellEfitBuffer(25),
    ]),
  ),
  [0, 25],
);

assert.deepEqual(readSpellEfitMagnitudes(Buffer.from("no efit here", "ascii")), []);

const hircineShrineMgefFormId = 0x00aa0001;
const hircineHelperMgefFormId = 0x00aa0002;
const hircineMgefMap = new Map([
  ["WSN_AltarBlessing_Daedra_Hircine_Effect", hircineShrineMgefFormId],
]);

const hircineSpell = Buffer.concat([
  buildSpellEfidBuffer(hircineHelperMgefFormId),
  buildSpellEfitBuffer(2),
  buildSpellEfidBuffer(hircineShrineMgefFormId),
  buildSpellEfitBuffer(25),
]);

assert.deepEqual(
  readSpellMagnitudesForFormIds(hircineSpell, new Set([hircineShrineMgefFormId])),
  [25],
);

const hircineBlessing = collectAltarBlessingFromSpellBuffer(
  hircineSpell,
  "WSN_AltarBlessing_Daedra_Hircine_Spell",
  "Wintersun.esp",
  hircineMgefMap,
);
assert.deepEqual(hircineBlessing?.magnitudes, [25]);
assert.equal(hircineBlessing?.shrineMgefEdid, "WSN_AltarBlessing_Daedra_Hircine_Effect");

const histArmorFaithsFormId = 0x0424c5e7;
const histArmorReqFormId = 0x1b24c5e7;
const histMasters = Array.from({ length: 0x1c }, () => "");
histMasters[0x1b] = "wintersun - faiths of skyrim.esp";

const histBlessing = collectAltarBlessingFromSpellBuffer(
  Buffer.concat([
    buildSpellEfidBuffer(0x00fbff5),
    buildSpellEfitBuffer(25),
    buildSpellEfidBuffer(histArmorReqFormId),
    buildSpellEfitBuffer(100),
  ]),
  "WSN_AltarBlessing_Misc_TheHist_Spell",
  "Wintersun - Reqtificated.esp",
  {
    formIdsByEdid: new Map([
      ["WSN_AltarBlessing_Misc_TheHist_armor_Effect", histArmorFaithsFormId],
    ]),
    edidByFormIdentity: new Map([
      ["wintersun - faiths of skyrim.esp|24c5e7", "WSN_AltarBlessing_Misc_TheHist_armor_Effect"],
    ]),
    ownerPluginLower: "wintersun - reqtificated.esp",
    masters: histMasters,
  },
);
assert.deepEqual(histBlessing?.magnitudes, [100]);
assert.equal(histBlessing?.shrineMgefEdid, "WSN_AltarBlessing_Misc_TheHist_armor_Effect");

const malacathBoonMgefFormId = 0x00bb0001;
const malacathNoiseMgefFormId = 0x00bb0002;
const malacathMgefMap = new Map([
  ["WSN_Daedra_Malacath_Boon2_Effect_Ab", malacathBoonMgefFormId],
]);

const malacathBoonSpell = Buffer.concat([
  buildSpellEfidBuffer(malacathNoiseMgefFormId),
  buildSpellEfitBuffer(5),
  buildSpellEfidBuffer(malacathBoonMgefFormId),
  buildSpellEfitBuffer(20),
]);

const malacathBoon = collectBoonFromSpellBuffer(
  malacathBoonSpell,
  "WSN_Daedra_Malacath_Boon2_Spell_Ab",
  "Wintersun.esp",
  malacathMgefMap,
);
assert.equal(malacathBoon?.altarKey, "Daedra_Malacath");
assert.equal(malacathBoon?.boonNumber, 2);
assert.deepEqual(malacathBoon?.magnitudes, [20]);

const variantBoon = collectBoonFromSpellBuffer(
  buildSpellEfitBuffer(40),
  "WSN_Daedra_Malacath_Boon2_Spell_CloakProc",
  "Wintersun.esp",
);
assert.equal(variantBoon?.isVariant, true);

const tribunalShrineMgefFormId = 0x1c00084a;
const tribunalCcBuffer = Buffer.concat([
  buildSpellEfidBuffer(0x000fbff5),
  buildSpellEfitBuffer(25),
  buildSpellEfidBuffer(tribunalShrineMgefFormId),
  buildSpellEfitBuffer(15),
]);
const tribunalCcBlessing = collectAltarBlessingFromSpellBuffer(
  tribunalCcBuffer,
  "ccASVSSE001_AlmalexiaSpell",
  "Wintersun - Reqtificated.esp",
  new Map([["WSN_AltarBlessing_Tribunal_Almalexia_Effect", tribunalShrineMgefFormId]]),
);
assert.deepEqual(tribunalCcBlessing?.magnitudes, [15]);
assert.equal(tribunalCcBlessing?.altarKey, "Tribunal_Almalexia");
assert.equal(tribunalCcBlessing?.shrineMgefEdid, "WSN_AltarBlessing_Tribunal_Almalexia_Effect");

const multiEffectWithoutLookup = collectAltarBlessingFromSpellBuffer(
  Buffer.concat([buildSpellEfitBuffer(2), buildSpellEfitBuffer(25)]),
  "WSN_AltarBlessing_Daedra_Hircine_Spell",
  "Wintersun.esp",
);
assert.deepEqual(multiEffectWithoutLookup?.magnitudes, [2, 25]);

const multiEffectWithLookup = collectAltarBlessingFromSpellBuffer(
  hircineSpell,
  "WSN_AltarBlessing_Daedra_Hircine_Spell",
  "Wintersun.esp",
  hircineMgefMap,
);
assert.deepEqual(multiEffectWithLookup?.magnitudes, [25]);

console.log("esp-reader tests passed");
