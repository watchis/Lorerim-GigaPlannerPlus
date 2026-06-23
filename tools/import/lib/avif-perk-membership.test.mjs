import assert from "node:assert/strict";
import {
  buildAvifMembershipIndex,
  isPerkDisplayedInSkill,
} from "./avif-perk-membership.mjs";
import {
  collectDisplayedPerkRecords,
  findTreePerkRecord,
} from "./perk-import-filter.mjs";

const identityToName = new Map([
  ["skyrim.esm|100", "Novice Destruction"],
  ["skyrim.esm|200", "Apprentice Destruction"],
  ["req.esp|300", "Blood Magic"],
  ["ordinator.esp|400", "Blood Magic"],
]);

const membership = buildAvifMembershipIndex(
  new Map([
    [
      "destruction",
      {
        skillId: "destruction",
        sections: [
          { identity: "skyrim.esm|100", inam: 1, cnam: [], x: 0, y: 0 },
          { identity: "skyrim.esm|200", inam: 2, cnam: [1], x: 1, y: 0 },
          { identity: "req.esp|300", inam: 3, cnam: [2], x: 2, y: 0 },
        ],
      },
    ],
  ]),
  identityToName,
);

assert.equal(membership.hasAvifData, true);
assert.equal(membership.allDisplayedIdentities.size, 3);
assert.equal(isPerkDisplayedInSkill("Novice Destruction", "destruction", membership), true);
assert.equal(isPerkDisplayedInSkill("Shadow Warrior", "destruction", membership), false);
assert.equal(isPerkDisplayedInSkill("Shadow Warrior", "sneak", membership), true);

const perkRecords = [
  {
    edid: "REQ_Destruction_BloodMagic_075_",
    name: "Blood Magic",
    perkMeta: { formIdentity: "req.esp|300" },
  },
  {
    edid: "ORD_Des_BloodMagic",
    name: "Blood Magic",
    perkMeta: { formIdentity: "ordinator.esp|400" },
  },
  {
    edid: "REQ_Destruction_Novice",
    name: "Novice Destruction",
    perkMeta: { formIdentity: "skyrim.esm|100" },
  },
];

const displayed = collectDisplayedPerkRecords(perkRecords, membership);
assert.equal(displayed.length, 2);
assert.ok(displayed.some((record) => record.edid.startsWith("REQ_Destruction_Novice")));

const match = findTreePerkRecord("Blood Magic", displayed, {
  skillId: "destruction",
  membership,
});
assert.equal(match?.edid, "REQ_Destruction_BloodMagic_075_");

const noAvifMatch = findTreePerkRecord("Blood Magic", perkRecords, { membership });
assert.equal(noAvifMatch?.perkMeta?.formIdentity, "req.esp|300");

console.log("avif-perk-membership.test.mjs: ok");
