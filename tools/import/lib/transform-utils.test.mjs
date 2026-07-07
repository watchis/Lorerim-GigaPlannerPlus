import assert from "node:assert/strict";
import {
  cleanDescription,
  cleanName,
  cleanWintersunEffectText,
  meaningfulEffectMagnitude,
  slugify,
} from "./transform-utils.mjs";

assert.equal(cleanName("  Blood <br/> Magic  "), "Blood Magic");
assert.equal(slugify("Quarterstaff & Battlestaff Focus"), "quarterstaff-battlestaff-focus");
assert.equal(
  cleanDescription("Gain power. <mag> [Requires Level 20] extra"),
  "Gain power. mag extra",
);

assert.equal(meaningfulEffectMagnitude(0), null);
assert.equal(meaningfulEffectMagnitude(-5), null);
assert.equal(meaningfulEffectMagnitude(25.4), 25.4);
assert.equal(meaningfulEffectMagnitude(25.0001), 25.0001);

assert.equal(
  cleanWintersunEffectText("Blessing increases armor by <mag> (based on favor with Azura). Costs 10% favor.", 25),
  "Blessing increases armor by 25.",
);
assert.equal(
  cleanWintersunEffectText("Restore <mag> and <mag> points.", [2, 3]),
  "Restore 2 and 3 points.",
);
assert.equal(cleanWintersunEffectText("Increased damage by points.", 10), "");
assert.equal(cleanWintersunEffectText("Damage reduced by 10%%.", 10), "Damage reduced by 10%.");

console.log("transform-utils.test.mjs: ok");
