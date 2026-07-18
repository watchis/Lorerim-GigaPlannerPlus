import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  extractFaithEffectsFromPlugins,
  filterFaithMesgRecords,
  filterFaithMgefRecords,
  indexDeityFaithMgef,
  parseShrineMgefAltarKey,
  parseWorshipMessage,
} from "./deity-faith-from-plugins.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

assert.deepEqual(
  parseWorshipMessage(
    "Intro.\n\nFollower: Summoned undead last longer.\n\nDevotee: Allied undead deal more damage.\n\nTenets: Trap souls.",
  ),
  {
    intro: "Intro.",
    follower: "Summoned undead last longer.",
    devotee: "Allied undead deal more damage.",
    tenets: "Trap souls.",
  },
);

const mannimarcoMgef = indexDeityFaithMgef([
  {
    edid: "WSN_Daedra_Mannimarco_Effect",
    effectDescription: "ignored shrine without AltarBlessing prefix",
  },
  {
    edid: "WSN_AltarBlessing_Daedra_Mannimarco_Effect",
    effectDescription: "10% Stronger Conjuration Spells",
  },
  {
    edid: "WSN_Daedra_Mannimarco_Boon1_Effect_Ab",
    effectDescription:
      "Summoned undead last up to <mag>% longer and necrotic spells are up to 10% stronger.",
  },
  {
    edid: "WSN_Daedra_Mannimarco_Boon2_Effect_Ab",
    effectDescription: "Allied undead conjurations deal up to 20% more physical damage.",
  },
]);

const mannimarco = extractFaithEffectsFromPlugins({
  altarKey: "Daedra_Mannimarco",
  mgefIndex: mannimarcoMgef,
});
assert.equal(mannimarco.shrine, "10% Stronger Conjuration Spells");
assert.match(mannimarco.follower, /Summoned undead last up to/i);
assert.match(mannimarco.devotee, /Allied undead conjurations deal up to 20%/i);

const oldWaysMgef = indexDeityFaithMgef([
  {
    edid: "WSN_AltarBlessing_Totems_Effect",
    effectDescription: "15% Damage and Crit Against Animals",
  },
  {
    edid: "WSN_AltarBlessing_Totems_Boon1_Effect_Ab",
    effectDescription:
      "Pray to sacrifice 100 gold to gain the abilities of an animal. Deal/take up to 15% more/less damage in full Forsworn/Fur/Hide/Leather armor.",
  },
  {
    edid: "WSN_Totems_Boon2_Effect_Ab",
    effectDescription: "Able to assume the powers of a dragon. Frost spells deal up to 20% more damage.",
  },
]);

const oldWays = extractFaithEffectsFromPlugins({
  altarKey: "Totems",
  mgefIndex: oldWaysMgef,
});
assert.equal(oldWays.shrine, "15% Damage and Crit Against Animals");
assert.match(oldWays.follower, /sacrifice 100 gold/i);
assert.match(oldWays.devotee, /powers of a dragon/i);

assert.equal(parseShrineMgefAltarKey("WSN_AltarBlessing_Tribunal_Almalexia_Effect"), "Tribunal_Almalexia");
assert.equal(parseShrineMgefAltarKey("WSN_AltarBlessing_Divine_Akatosh"), "Divine_Akatosh");
assert.equal(
  parseShrineMgefAltarKey("WSN_AltarBlessing_Tribunal_Almalexia_BuffOnly_Effect_Ab"),
  "Tribunal_Almalexia",
);
assert.equal(parseShrineMgefAltarKey("WSN_Tribunal_Vivec_Effect_Ab"), "Tribunal_Vivec");
assert.equal(parseShrineMgefAltarKey("WSN_Tribunal_Almalexia_Boon1_Effect_Ab"), null);

const akatoshShrine = indexDeityFaithMgef([
  {
    edid: "WSN_AltarBlessing_Divine_Akatosh_BuffOnly_Effect_Ab",
    effectDescription: "Learn all skills <mag>% faster.",
  },
  {
    edid: "WSN_AltarBlessing_Divine_Akatosh_Effect",
    effectDescription: "Resist <mag>% of fire damage.",
  },
]);

const akatosh = extractFaithEffectsFromPlugins({
  altarKey: "Divine_Akatosh",
  mgefIndex: akatoshShrine,
  altarMagnitudes: [15],
  shrineMgefEdid: "WSN_AltarBlessing_Divine_Akatosh",
});
assert.equal(akatosh.shrine, "Resist 15% of fire damage.");

const akatoshWrongIndex = extractFaithEffectsFromPlugins({
  altarKey: "Divine_Akatosh",
  mgefIndex: indexDeityFaithMgef([
    {
      edid: "WSN_AltarBlessing_Divine_Akatosh_Effect",
      effectDescription: "Learn all skills <mag>% faster.",
    },
    {
      edid: "WSN_AltarBlessing_Divine_Akatosh",
      effectDescription: "Resist <mag>% of fire damage.",
    },
  ]),
  altarMagnitudes: [15],
  shrineMgefEdid: "WSN_AltarBlessing_Divine_Akatosh",
});
assert.equal(akatoshWrongIndex.shrine, "Resist 15% of fire damage.");

const tribunalShrineFromAbilityMgef = extractFaithEffectsFromPlugins({
  altarKey: "Tribunal_Almalexia",
  mgefIndex: indexDeityFaithMgef([
    {
      edid: "WSN_AltarBlessing_Tribunal_Almalexia_BuffOnly_Effect_Ab",
      effectDescription: "Increases your Health and Stamina by <mag> points.",
    },
  ]),
  altarMagnitudes: [15],
});
assert.equal(
  tribunalShrineFromAbilityMgef.shrine,
  "Increases your Health and Stamina by 15 points.",
);

const tribunalShrine = extractFaithEffectsFromPlugins({
  altarKey: "Tribunal_Almalexia",
  mgefIndex: indexDeityFaithMgef([
    {
      edid: "WSN_AltarBlessing_Tribunal_Almalexia_Effect",
      effectDescription: "Increases your Health and Stamina by <mag> points.",
      effectMagnitude: 15,
    },
  ]),
});
assert.equal(
  tribunalShrine.shrine,
  "Increases your Health and Stamina by 15 points.",
);

const tribunalSpellMagnitude = extractFaithEffectsFromPlugins({
  altarKey: "Tribunal_Almalexia",
  mgefIndex: indexDeityFaithMgef([
    {
      edid: "WSN_AltarBlessing_Tribunal_Almalexia_Effect",
      effectDescription: "Increases your Health and Stamina by <mag> points.",
    },
  ]),
  altarMagnitudes: [15],
});
assert.equal(
  tribunalSpellMagnitude.shrine,
  "Increases your Health and Stamina by 15 points.",
);

const hircineShrine = extractFaithEffectsFromPlugins({
  altarKey: "Daedra_Hircine",
  mgefIndex: indexDeityFaithMgef([
    {
      edid: "WSN_AltarBlessing_Daedra_Hircine_Effect",
      effectDescription: "Regenerate Stamina <mag>% faster.",
    },
  ]),
  altarMagnitudes: [25],
});
assert.equal(hircineShrine.shrine, "Regenerate Stamina 25% faster.");

const patchedAzuraMgef = filterFaithMgefRecords([
  {
    edid: "REQ_SomeUnrelatedEffect",
    effectDescription: "Should be ignored.",
    plugin: "Requiem.esp",
  },
  {
    edid: "WSN_AltarBlessing_Daedra_Azura_Effect",
    effectDescription: "Resist <mag>% of magic.",
    plugin: "Requiem - Wintersun Patch.esp",
  },
]);
assert.equal(patchedAzuraMgef.length, 1);

// LoreRim output may own the winning WSN_ MESG; filter by EDID, not plugin name.
const patchedEbonarmMesg = filterFaithMesgRecords([
  {
    edid: "WSN_WorshipRequest_Message_Misc_Ebonarm",
    description: "Pray to Ebonarm.",
    plugin: "LoreRim - xEdit64 Output.esp",
  },
  {
    edid: "SomeOtherMessage",
    description: "ignored",
    plugin: "Wintersun - Faiths of Skyrim.esp",
  },
]);
assert.equal(patchedEbonarmMesg.length, 1);
assert.equal(patchedEbonarmMesg[0].edid, "WSN_WorshipRequest_Message_Misc_Ebonarm");

const azuraShrine = extractFaithEffectsFromPlugins({
  altarKey: "Daedra_Azura",
  mgefIndex: indexDeityFaithMgef(patchedAzuraMgef),
  altarMagnitudes: [10],
  shrineMgefEdid: "WSN_AltarBlessing_Daedra_Azura_Effect",
});
assert.equal(azuraShrine.shrine, "Resist 10% of magic.");

const ignoredZeroMagnitude = extractFaithEffectsFromPlugins({
  altarKey: "Daedra_Hircine",
  mgefIndex: indexDeityFaithMgef([
    {
      edid: "WSN_AltarBlessing_Daedra_Hircine_Effect",
      effectDescription: "Regenerate Stamina <mag>% faster.",
      effectMagnitude: 0,
    },
  ]),
  altarMagnitudes: [0],
});
assert.equal(ignoredZeroMagnitude.shrine, "-", "zero magnitudes must not render as 0%");

const unresolvedMag = extractFaithEffectsFromPlugins({
  altarKey: "Tribunal_Almalexia",
  mgefIndex: indexDeityFaithMgef([
    {
      edid: "WSN_AltarBlessing_Tribunal_Almalexia_Effect",
      effectDescription: "Increases your Health and Stamina by <mag> points.",
    },
  ]),
});
assert.equal(unresolvedMag.shrine, "-", "unresolved <mag> should not render literal 'mag'");

const BOON_DISTANCE_FIXTURES = [
  {
    altarKey: "Daedra_Malacath",
    boon: 2,
    dnam: "When an enemy dies within <mag> feet, their killer is healed based on the amount of overkill damage dealt (scaling with favor with Malacath).",
    magnitudes: [20],
    expected: /within 20 feet/i,
  },
  {
    altarKey: "Daedra_Azura",
    boon: 1,
    dnam: "Foes within <mag> feet can absorb spells and suffer up to <20>% reduced magic resistance, chameleon and blind spells are up to <25>% cheaper (based on favor with Azura)",
    magnitudes: [100],
    expected: /within 100 feet/i,
  },
  {
    altarKey: "Divine_Mara",
    boon: 2,
    dnam: "Living allies within <mag> feet are healed up to <20> points of magicka and health per second (based on favor with Mara). Take <25>% less physical damage when your hands are lowered.",
    magnitudes: [100],
    expected: /within 100 feet/i,
  },
  {
    altarKey: "Divine_Talos",
    boon: 2,
    dnam: "Your remaining shout cooldown is halved whenever an enemy dies within <mag> feet.",
    magnitudes: [20],
    expected: /within 20 feet/i,
  },
  {
    altarKey: "Daedra_Namira",
    boon: 1,
    dnam: "Reduces Poison Resist of all within <mag> feet by up to <40>% (based on favor with Namira). Grants strong stomach and strange meat on kills.",
    magnitudes: [100],
    expected: /within 100 feet/i,
  },
  {
    altarKey: "Misc_Ebonarm",
    boon: 2,
    dnam: "Transfer armor of enemies within <mag> feet by up to <200> (based on favor with Ebonarm). Doubled against daedra. Bonus to frost and shock resist when wearing Ebony Armor.",
    magnitudes: [40],
    expected: /within 40 feet/i,
  },
];

for (const fixture of BOON_DISTANCE_FIXTURES) {
  const edidSuffix = fixture.boon === 1 ? "Boon1" : "Boon2";
  const indexed = indexDeityFaithMgef([
    {
      edid: `WSN_${fixture.altarKey}_${edidSuffix}_Effect_Ab`,
      effectDescription: fixture.dnam,
    },
  ]);
  const extracted = extractFaithEffectsFromPlugins({
    altarKey: fixture.altarKey,
    mgefIndex: indexed,
    followerMagnitudes: fixture.boon === 1 ? fixture.magnitudes : null,
    devoteeMagnitudes: fixture.boon === 2 ? fixture.magnitudes : null,
  });
  const text = fixture.boon === 1 ? extracted.follower : extracted.devotee;
  assert.match(text, fixture.expected, `${fixture.altarKey} boon${fixture.boon} distance`);
  assert.doesNotMatch(text, /within feet/i, `${fixture.altarKey} boon${fixture.boon} should not drop distance`);
}

const fixtureCsv = readFileSync(join(__dirname, "deity-faith-effects.sample.csv"), "utf8");
const fixtureRows = fixtureCsv
  .trim()
  .split("\n")
  .slice(1)
  .map((line) => line.match(/"([^"]*)"/g)?.map((cell) => cell.slice(1, -1)) ?? []);

for (const [name, shrine, follower, devotee] of fixtureRows) {
  if (!name || name === "Diety") continue;
  const altarKey =
    name === "Mannimarco"
      ? "Daedra_Mannimarco"
      : name === "The Old Ways"
        ? "Totems"
        : name === "Almalexia"
          ? "Tribunal_Almalexia"
          : null;
  if (!altarKey) continue;

  if (name === "Almalexia") {
    const indexed = indexDeityFaithMgef([
      {
        edid: `WSN_AltarBlessing_${altarKey}_Effect`,
        effectDescription: "Increases your Health and Stamina by <mag> points.",
      },
      { edid: `WSN_${altarKey}_Boon1_Effect_Ab`, effectDescription: follower },
      { edid: `WSN_${altarKey}_Boon2_Effect_Ab`, effectDescription: devotee },
    ]);
    const extracted = extractFaithEffectsFromPlugins({
      altarKey,
      mgefIndex: indexed,
      altarMagnitudes: [15],
    });
    assert.equal(
      extracted.shrine,
      "Increases your Health and Stamina by 15 points.",
      "Almalexia keeps in-game DNAM wording after magnitude substitution",
    );
    assert.equal(extracted.follower, follower, `${name} follower`);
    assert.equal(extracted.devotee, devotee, `${name} devotee`);
    continue;
  }

  const indexed = indexDeityFaithMgef([
    { edid: `WSN_AltarBlessing_${altarKey}_Effect`, effectDescription: shrine },
    { edid: `WSN_${altarKey}_Boon1_Effect_Ab`, effectDescription: follower },
    { edid: `WSN_${altarKey}_Boon2_Effect_Ab`, effectDescription: devotee },
  ]);
  const extracted = extractFaithEffectsFromPlugins({ altarKey, mgefIndex: indexed });
  assert.equal(extracted.shrine, shrine, `${name} shrine`);
  assert.equal(extracted.follower, follower, `${name} follower`);
  assert.equal(extracted.devotee, devotee, `${name} devotee`);
}

console.log("deity-faith-from-plugins tests passed");
