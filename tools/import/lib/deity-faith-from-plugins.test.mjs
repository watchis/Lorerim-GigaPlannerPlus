import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  extractFaithEffectsFromPlugins,
  indexDeityFaithMgef,
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
  altarMagnitude: 15,
});
assert.equal(
  tribunalSpellMagnitude.shrine,
  "Increases your Health and Stamina by 15 points.",
);

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
