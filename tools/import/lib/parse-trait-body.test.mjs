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

assertSplit(
  "If it ain't broke, don't fix it. Weapons, armor and magical staves made of iron, wood, steel, forsworn, scaled, leather fur or hide are 15% stronger. Otherwise, they are 10% weaker.",
  {
    description: "If it ain't broke, don't fix it.",
    bonus:
      "Weapons, armor and magical staves made of iron, wood, steel, forsworn, scaled, leather fur or hide are 15% stronger. Otherwise, they are 10% weaker.",
  },
);

assertSplit(
  "But master of none. Novice, Apprentice and Adept spells are 20% stronger or longer lasting, expert and master spells are 20% weaker or shorter.",
  {
    description: "But master of none.",
    bonus:
      "Novice, Apprentice and Adept spells are 20% stronger or longer lasting, expert and master spells are 20% weaker or shorter.",
  },
);

assertSplit(
  "Druids are attuned to nature, making spriggans friendly and increasing power of druidic spells by 30%. You can craft Lifebloom Essence from Taproot and Spriggan Sap for powerful regeneration. However, your bond with the wild leaves you 25% more vulnerable to fire and axes.",
  {
    description: "",
    bonus:
      "Druids are attuned to nature, making spriggans friendly and increasing power of druidic spells by 30%. You can craft Lifebloom Essence from Taproot and Spriggan Sap for powerful regeneration. However, your bond with the wild leaves you 25% more vulnerable to fire and axes.",
  },
);

assertSplit(
  "You are fluent in Dragon speech and as such can shout 20% more often, at 30% reduced effectiveness.",
  {
    description: "",
    bonus:
      "You are fluent in Dragon speech and as such can shout 20% more often, at 30% reduced effectiveness.",
  },
);

assertSplit(
  "Embrace your divine gifts! Start with +100 health, magicka, and stamina. For each piece of armor or clothing you wear, you lose 40 from each attribute (up to a maximum loss of -160 with four pieces equipped). Additionally, you gain +1 to health, magicka, and stamina per level for each empty armor slot (head, chest, hands, and feet).",
  {
    description: "Embrace your divine gifts!",
    bonus:
      "Start with +100 health, magicka, and stamina. For each piece of armor or clothing you wear, you lose 40 from each attribute (up to a maximum loss of -160 with four pieces equipped). Additionally, you gain +1 to health, magicka, and stamina per level for each empty armor slot (head, chest, hands, and feet).",
  },
);

assertSplit(
  "Your magic flows through melody and vibration. After playing an instrument at an inn, your sonic spells become 20% more powerful. However, your booming presence makes hiring followers more expensive, and your reliance on sound magic weakens your physical attacks by 15%.",
  {
    description: "Your magic flows through melody and vibration.",
    bonus:
      "After playing an instrument at an inn, your sonic spells become 20% more powerful. However, your booming presence makes hiring followers more expensive, and your reliance on sound magic weakens your physical attacks by 15%.",
  },
);

assertSplit("Power attacks are 20% stronger, but light attacks are 25% weaker.", {
  description: "",
  bonus: "Power attacks are 20% stronger, but light attacks are 25% weaker.",
});

assertSplit(
  "Your afflictions fuel your fury! Your unarmed attacks deal +10 unresistable disease damage per disease, and the effect of diseases on you is reduced by 50%. Your disease resistance is reduced by 200%.",
  {
    description: "Your afflictions fuel your fury!",
    bonus:
      "Your unarmed attacks deal +10 unresistable disease damage per disease, and the effect of diseases on you is reduced by 50%. Your disease resistance is reduced by 200%.",
  },
);

assertSplit(
  "You tap into your own life essence to empower your blood magic, increasing its potency, but leaving you more fragile. Blood and Absorb spells are 20% stronger, but your health is reduced by 2 * your level.",
  {
    description:
      "You tap into your own life essence to empower your blood magic, increasing its potency, but leaving you more fragile.",
    bonus: "Blood and Absorb spells are 20% stronger, but your health is reduced by 2 * your level.",
  },
);

assertSplit(
  "Your presence commands fear, intimidation checks almost always succeed, and frenzy spells are 20% stronger. However, your persuasive charm is lacking, making persuasion checks harder, and your pacifying spells are 20% weaker.",
  {
    description: "Your presence commands fear.",
    bonus:
      "intimidation checks almost always succeed, and frenzy spells are 20% stronger. However, your persuasive charm is lacking, making persuasion checks harder, and your pacifying spells are 20% weaker.",
  },
);

assertSplit(
  "Your touch and cloak spells are 20% stronger. All other spell types are 10% weaker or last 10% less.",
  {
    description: "",
    bonus:
      "Your touch and cloak spells are 20% stronger. All other spell types are 10% weaker or last 10% less.",
  },
);

assertSplit(". Power attacks are 20% stronger, but light attacks are 25% weaker.", {
  description: "",
  bonus: "Power attacks are 20% stronger, but light attacks are 25% weaker.",
});

assertSplit(
  ". Your wands are 30% more effective when wearing a wizard hat. When not wearing a wizard hat, all spells are 10% less powerful or last 10% less.",
  {
    description: "",
    bonus:
      "Your wands are 30% more effective when wearing a wizard hat. When not wearing a wizard hat, all spells are 10% less powerful or last 10% less.",
  },
);

assertSplit(
  "Wizard's Wardrobe. Your wands are 30% more effective when wearing a wizard hat. When not wearing a wizard hat, all spells are 10% less powerful or last 10% less.",
  {
    description: "Wizard's Wardrobe.",
    bonus:
      "Your wands are 30% more effective when wearing a wizard hat. When not wearing a wizard hat, all spells are 10% less powerful or last 10% less.",
  },
);

console.log("parse-trait-body: ok");
