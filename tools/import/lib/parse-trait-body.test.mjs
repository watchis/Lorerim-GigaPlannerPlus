import assert from "node:assert/strict";
import { parseTraitBody } from "./parse-trait-body.mjs";

function assertSplit(input, expected) {
  assert.deepEqual(parseTraitBody(input), expected);
}

assertSplit(
  "You love carrying stuff around, even if it's junk. Gain +200 carryweight. Selling prices are 50% worse.",
  {
    description: "You love carrying stuff around, even if it's junk.",
    bonus: "Gain +200 carryweight. Selling prices are 50% worse.",
  },
);

assertSplit(
  "Handwear constricts you. Spells are 15% stronger and unarmed attacks do +30 more damage when not wearing gloves/gauntlets. However, they suffer the opposite effect when wearing gloves/gauntlets.",
  {
    description: "Handwear constricts you.",
    bonus:
      "Spells are 15% stronger and unarmed attacks do +30 more damage when not wearing gloves/gauntlets. However, they suffer the opposite effect when wearing gloves/gauntlets.",
  },
);

assertSplit(
  "When your arms are lowered you restore 2 magicka and stamina per second. However, raising your hands in combat will have the opposite effect.",
  {
    description: "",
    bonus:
      "When your arms are lowered you restore 2 magicka and stamina per second. However, raising your hands in combat will have the opposite effect.",
  },
);

assertSplit(
  "Descended from the mighty giants; you gain 10% magic resistance and damage with blunt weapons, however you cannot read skill books, or use scrolls and staves.",
  {
    description: "Descended from the mighty giants.",
    bonus:
      "you gain 10% magic resistance and damage with blunt weapons, however you cannot read skill books, or use scrolls and staves.",
  },
);

assertSplit("A cozy home in Whiterun!", {
  description: "A cozy home in Whiterun!",
  bonus: "",
});

console.log("parse-trait-body: ok");
