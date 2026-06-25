import assert from "node:assert/strict";
import {
  parseBonusEffects,
  extractConditionalBonusDetails,
  trimBonusClauses,
} from "./parse-bonus-effects.mjs";

function assertEffects(actual, expected) {
  assert.equal(actual.length, expected.length, `length ${actual.length} !== ${expected.length}`);
  for (let index = 0; index < expected.length; index++) {
    assert.deepEqual(actual[index], expected[index]);
  }
}

assertEffects(
  parseBonusEffects(
    "Shoot to kill. Bows and crossbows deal 20% more damage. However, they draw/reload 40% slower.",
  ),
  [
    { type: "derivedStat", stat: "bowDamage", value: 20, isPercent: true },
    { type: "derivedStat", stat: "crossbowDamage", value: 20, isPercent: true },
    { type: "derivedStat", stat: "drawSpeed", value: -40, isPercent: true },
    { type: "derivedStat", stat: "reloadSpeed", value: -40, isPercent: true },
  ],
);

assertEffects(
  parseBonusEffects(
    "You'd rather shoot fast than shoot hard. Bows draw 40% faster, crossbows reload 40% faster. However, bows and crossbows deal 30% less damage.",
  ),
  [
    { type: "derivedStat", stat: "drawSpeed", value: 40, isPercent: true },
    { type: "derivedStat", stat: "reloadSpeed", value: 40, isPercent: true },
    { type: "derivedStat", stat: "bowDamage", value: -30, isPercent: true },
    { type: "derivedStat", stat: "crossbowDamage", value: -30, isPercent: true },
  ],
);

assertEffects(parseBonusEffects("Gain +200 carryweight. Selling prices are 50% worse."), [
  { type: "derivedStat", stat: "carryWeight", value: 200, isPercent: false },
  { type: "derivedStat", stat: "priceModifier", value: -50, isPercent: true },
]);

assert.deepEqual(
  extractConditionalBonusDetails(
    "Handwear constricts you. Spells are 15% stronger and unarmed attacks do +30 more damage when not wearing gloves/gauntlets. However, they suffer the opposite effect when wearing gloves/gauntlets.",
    parseBonusEffects(
      "Spells are 15% stronger and unarmed attacks do +30 more damage when not wearing gloves/gauntlets.",
    ),
  ),
  [
    "Spells are 15% stronger and unarmed attacks do +30 more damage when not wearing gloves/gauntlets. They suffer the opposite effect when wearing gloves/gauntlets.",
  ],
);

assert.deepEqual(
  extractConditionalBonusDetails(
    "When your arms are lowered you restore 2 magicka and stamina per second. However, raising your hands in combat will have the opposite effect. Those born under the sign of the Atronach only restore 1 but still drain 2.",
    [],
  ),
  [
    "When your arms are lowered you restore 2 magicka and stamina per second. Raising your hands in combat will have the opposite effect.",
    "Those born under the sign of the Atronach only restore 1 but still drain 2.",
  ],
);

assert.deepEqual(
  extractConditionalBonusDetails(
    "You can have 1 additional summon or undead thrall. However, the duration of summon and resurrecting spells is reduced by 33%.",
    [],
  ),
  [
    "You can have 1 additional summon or undead thrall.",
    "The duration of summon and resurrecting spells is reduced by 33%.",
  ],
);

assert.deepEqual(trimBonusClauses("However, the duration of summon and resurrecting spells is reduced by 33%."), [
  "The duration of summon and resurrecting spells is reduced by 33%.",
]);

assertEffects(
  parseBonusEffects(
    "Health and Magicka increase by 40 and regenerate 80% faster, you can run or swim without exertion.",
  ),
  [
    { type: "attribute", stat: "health", value: 40 },
    { type: "attribute", stat: "magicka", value: 40 },
    { type: "derivedStat", stat: "healthRegen", value: 80, isPercent: true },
    { type: "derivedStat", stat: "magickaRegen", value: 80, isPercent: true },
    { type: "flag", stat: "noSprintCost" },
  ],
);

assertEffects(
  parseBonusEffects(
    "Movement is 10 percent faster and 20 percent when sprinting, stamina increased by 60, restore 1 stamina per second, most slow effects don't affect you.",
  ),
  [
    { type: "derivedStat", stat: "moveSpeed", value: 10, isPercent: true },
    { type: "attribute", stat: "stamina", value: 60 },
  ],
);

assertEffects(parseBonusEffects("25% chance to take half damage, prices are 15% better. Shouts are 20% stronger."), [
  { type: "derivedStat", stat: "dodgeChance", value: 25, isPercent: true },
  { type: "derivedStat", stat: "priceModifier", value: 15, isPercent: true },
  { type: "derivedStat", stat: "shoutPower", value: 20, isPercent: true },
]);

assertEffects(
  parseBonusEffects(
    "Health increases by 60, all weapons deal 10% more damage, armor penetration with all weapons is increased by 10 unarmed strikes do 10 additional damage.",
  ),
  [
    { type: "attribute", stat: "health", value: 60 },
    { type: "derivedStat", stat: "oneHandDamage", value: 10, isPercent: true },
    { type: "derivedStat", stat: "twoHandDamage", value: 10, isPercent: true },
    { type: "derivedStat", stat: "bowDamage", value: 10, isPercent: true },
    { type: "derivedStat", stat: "crossbowDamage", value: 10, isPercent: true },
    { type: "derivedStat", stat: "armorPenetrationMelee", value: 10, isPercent: false },
    { type: "derivedStat", stat: "armorPenetrationRanged", value: 10, isPercent: false },
    { type: "derivedStat", stat: "unarmedDamage", value: 10, isPercent: false },
  ],
);

assertEffects(
  parseBonusEffects(
    "Magic weakness increased by 25%, magicka regenerates an extra 5 per second, spells are 20% cheaper.",
  ),
  [
    { type: "derivedStat", stat: "magicResist", value: -25, isPercent: true },
    { type: "derivedStat", stat: "spellCost", value: -20, isPercent: true },
  ],
);

assertEffects(
  parseBonusEffects(
    "Gain more gold when killing enemies, 50 more carryweight, lockpicking expertise is increased by 4, you can pick effortless locks in plain sight without being noticed, reflect 15% physical damage.",
  ),
  [
    { type: "derivedStat", stat: "carryWeight", value: 50, isPercent: false },
    { type: "derivedStat", stat: "lockpicking", value: 4, isPercent: false },
  ],
);

assertEffects(
  parseBonusEffects(
    "Gain 15% Magic Resist and 150 armor rating, restore 1.5 health per second, gain 30% Weakness to Fire.",
  ),
  [
    { type: "derivedStat", stat: "magicResist", value: 15, isPercent: true },
    { type: "derivedStat", stat: "armorRating", value: 150, isPercent: false },
    { type: "derivedStat", stat: "healthRegenRate", value: 1.5, isPercent: false },
    { type: "derivedStat", stat: "fireResist", value: -30, isPercent: true },
  ],
);

assertEffects(
  parseBonusEffects(
    "Magicka increases by 300, do not lose magicka when hit, absorb chance increased by 25%, you cannot naturally regenerate magicka.",
  ),
  [
    { type: "attribute", stat: "magicka", value: 300 },
    { type: "derivedStat", stat: "magicAbsorb", value: 25, isPercent: true },
    { type: "flag", stat: "noMagickaRegen" },
  ],
);

assertEffects(parseBonusEffects("Magicka increases by 150. Spells are 30% stronger and longer lasting when over 50% magicka."), [
  { type: "attribute", stat: "magicka", value: 150 },
]);

assert.deepEqual(
  extractConditionalBonusDetails(
    "Magicka increases by 150. Spells are 30% stronger and longer lasting when over 50% magicka.",
    parseBonusEffects("Magicka increases by 150. Spells are 30% stronger and longer lasting when over 50% magicka."),
  ),
  ["Spells are 30% stronger and longer lasting when over 50% magicka."],
);

assert.deepEqual(
  extractConditionalBonusDetails(
    "Pickpocketing is 50% easier, you are 40% harder to detect, move 20% faster when sneaking and can sneak without proficiency, 20% chance to avoid physical damage, 1% chance to take 50% more.",
    parseBonusEffects(
      "Pickpocketing is 50% easier, you are 40% harder to detect, move 20% faster when sneaking and can sneak without proficiency, 20% chance to avoid physical damage, 1% chance to take 50% more.",
    ),
  ),
  [
    "Pickpocketing is 50% easier.",
    "Move 20% faster when sneaking and can sneak without proficiency.",
    "1% chance to take 50% more.",
  ],
);

assertEffects(
  parseBonusEffects("Increases magic resistance by 30%."),
  [{ type: "derivedStat", stat: "magicResist", value: 30, isPercent: true }],
);

assertEffects(
  parseBonusEffects(
    "[Block 25% more damage with weapons and shields, take 25% less elemental damage when blocking with a shield and 10% less with a weapon]",
  ),
  [{ type: "derivedStat", stat: "damageTaken", value: -25, isPercent: true }],
);

assertEffects(
  parseBonusEffects("[15% more damage, +20% armor penetration]"),
  [
    { type: "derivedStat", stat: "meleeDamage", value: 15, isPercent: true },
    { type: "derivedStat", stat: "rangedDamage", value: 15, isPercent: true },
    { type: "derivedStat", stat: "armorPenetrationMelee", value: 20, isPercent: true },
    { type: "derivedStat", stat: "armorPenetrationRanged", value: 20, isPercent: true },
  ],
);

assertEffects(
  parseBonusEffects(
    "[+10% magic resistance and damage reflect, +200 armor rating while spirit summons are active]",
  ),
  [{ type: "derivedStat", stat: "magicResist", value: 10, isPercent: true }],
);

assertEffects(parseBonusEffects("Gain 15% magic resistance and 150 armor rating when fighting alone."), []);

assertEffects(
  parseBonusEffects(
    "You have learned the basics of the art of picking locks and carrying found goods. [+3 lockpicking expertise, +25 carry weight, forge lockpicks with Craftsmanship]",
  ),
  [
    { type: "derivedStat", stat: "lockpicking", value: 3, isPercent: false },
    { type: "derivedStat", stat: "carryWeight", value: 25, isPercent: false },
  ],
);

assertEffects(
  parseBonusEffects(
    "Reading skill books grants an extra skill point and trainers cost 50% less, however every 5 levels you don't gain a perk point.",
  ),
  [{ type: "derivedStat", stat: "priceModifier", value: 50, isPercent: true }],
);

assertEffects(
  parseBonusEffects(
    "Start with +100 health, magicka, and stamina. For each piece of armor or clothing you wear, you lose 40 from each attribute (up to a maximum loss of -160 with four pieces equipped).",
  ),
  [
    { type: "attribute", stat: "health", value: 100 },
    { type: "attribute", stat: "magicka", value: 100 },
    { type: "attribute", stat: "stamina", value: 100 },
  ],
);

assertEffects(
  parseBonusEffects(
    "Gain 30% chance to critical hit. However, overall weapon damage is reduced by 40%. When you land a critical hit, your attacks do 10% more damage for 30 seconds (stackable up to 5 times).",
  ),
  [
    { type: "derivedStat", stat: "criticalHitChance", value: 30, isPercent: true },
    { type: "derivedStat", stat: "meleeDamage", value: -40, isPercent: true },
    { type: "derivedStat", stat: "rangedDamage", value: -40, isPercent: true },
  ],
);

assertEffects(
  parseBonusEffects("Your Health, Magicka and Stamina are increased by 10 each."),
  [
    { type: "attribute", stat: "health", value: 10 },
    { type: "attribute", stat: "magicka", value: 10 },
    { type: "attribute", stat: "stamina", value: 10 },
  ],
);

assertEffects(parseBonusEffects("Block 15% more damage."), [
  { type: "derivedStat", stat: "damageTaken", value: -15, isPercent: true },
]);

assertEffects(parseBonusEffects("Restoration spells cost 10% less to cast."), [
  { type: "derivedStat", stat: "spellCost", value: -10, isPercent: true },
]);

assertEffects(parseBonusEffects("Increases carry weight by 25."), [
  { type: "derivedStat", stat: "carryWeight", value: 25, isPercent: false },
]);

assertEffects(parseBonusEffects("You deal 5% more weapon damage."), [
  { type: "derivedStat", stat: "meleeDamage", value: 5, isPercent: true },
  { type: "derivedStat", stat: "rangedDamage", value: 5, isPercent: true },
]);

assertEffects(parseBonusEffects("Your Magicka Regeneration is increased by 50%."), [
  { type: "derivedStat", stat: "magickaRegen", value: 50, isPercent: true },
]);

assertEffects(
  parseBonusEffects(
    "Resist Poison and Disease: Poison deals 25% less damage to you, you are 50% less likely to contract diseases.",
  ),
  [
    { type: "derivedStat", stat: "poisonResist", value: 25, isPercent: true },
    { type: "derivedStat", stat: "diseaseResist", value: 50, isPercent: true },
  ],
);

assertEffects(
  parseBonusEffects(
    "Weakness to Elements: High elves are more resistant to all elements. Fire, frost, and shock deal 10% less damage to you.",
  ),
  [
    { type: "derivedStat", stat: "fireResist", value: 10, isPercent: true },
    { type: "derivedStat", stat: "frostResist", value: 10, isPercent: true },
    { type: "derivedStat", stat: "shockResist", value: 10, isPercent: true },
  ],
);

assertEffects(
  parseBonusEffects(
    "Bulwark: Armor rating increases by 150, magic deals 10% less damage to you.",
  ),
  [
    { type: "derivedStat", stat: "armorRating", value: 150, isPercent: false },
    { type: "derivedStat", stat: "magicResist", value: 10, isPercent: true },
  ],
);

assertEffects(parseBonusEffects("Strong Stomach: Your metabolism can digest raw food without food poisoning."), [
  { type: "flag", stat: "rawFood" },
]);

assertEffects(
  parseBonusEffects(
    "Your improved fighting techniques increase your damage dealt with two-handed weapons. [20% more damage]",
  ),
  [{ type: "derivedStat", stat: "twoHandDamage", value: 20, isPercent: true }],
);

assertEffects(
  parseBonusEffects(
    "[50% more shield bash damage, double damage when not wearing heavy armor, 25% less shield bash stamina cost]",
  ),
  [
    { type: "derivedStat", stat: "meleeDamage", value: 50, isPercent: true },
    { type: "derivedStat", stat: "sprintCostReduction", value: 25, isPercent: true },
  ],
);

assertEffects(parseBonusEffects("[0.9x spell cost for all schools of magic]"), [
  { type: "derivedStat", stat: "spellCost", value: -10, isPercent: true },
]);

assertEffects(parseBonusEffects("[1.1x magnitude, 1.1x duration for all schools of magic]"), [
  { type: "derivedStat", stat: "spellDamage", value: 10, isPercent: true },
  { type: "derivedStat", stat: "spellDuration", value: 10, isPercent: true },
]);

assertEffects(
  parseBonusEffects("Your bows, crossbows and throwing knives do 10% more damage."),
  [
    { type: "derivedStat", stat: "bowDamage", value: 10, isPercent: true },
    { type: "derivedStat", stat: "crossbowDamage", value: 10, isPercent: true },
  ],
);

assertEffects(
  parseBonusEffects(
    "Your knowledge in combat tactics allow you to effectively lead your allies in combat. [Improve nearby allies' skills by 10%, increase magicka, stamina, and their regeneration by 50(%), increase unarmed damage by 5]",
  ),
  [],
);

assertEffects(
  parseBonusEffects("Nearby allies, but not the player, gain 150 armor rating and 15% magical resistance."),
  [],
);

assertEffects(
  parseBonusEffects(
    "Nearby allies deal 15% more physical damage and have 15% magic resistance during combat. Prices are 10% better.",
  ),
  [{ type: "derivedStat", stat: "priceModifier", value: 10, isPercent: true }],
);

assertEffects(parseBonusEffects("Resist 10% of magic."), [
  { type: "derivedStat", stat: "magicResist", value: 10, isPercent: true },
]);

assertEffects(parseBonusEffects("Conjuration spells cost 10% less to cast."), [
  { type: "derivedStat", stat: "spellCost", value: -10, isPercent: true },
]);

assertEffects(parseBonusEffects("Regenerate Stamina 25% faster."), [
  { type: "derivedStat", stat: "staminaRegen", value: 25, isPercent: true },
]);

assertEffects(parseBonusEffects("Increases Shock Resistance by 15%."), [
  { type: "derivedStat", stat: "shockResist", value: 15, isPercent: true },
]);

assertEffects(parseBonusEffects("You are 10% more effective with missile weapons."), [
  { type: "derivedStat", stat: "bowDamage", value: 10, isPercent: true },
  { type: "derivedStat", stat: "crossbowDamage", value: 10, isPercent: true },
]);

assertEffects(parseBonusEffects("Your Armor Rating is increased by 100."), [
  { type: "derivedStat", stat: "armorRating", value: 100, isPercent: false },
]);

assertEffects(parseBonusEffects("You have a 10% chance to absorb the Magicka from incoming spells."), [
  { type: "derivedStat", stat: "magicAbsorb", value: 10, isPercent: true },
]);

assertEffects(parseBonusEffects("Your tempering ability, weapon damage and Armor Rating is increased by 10%."), [
  { type: "derivedStat", stat: "meleeDamage", value: 10, isPercent: true },
  { type: "derivedStat", stat: "rangedDamage", value: 10, isPercent: true },
  { type: "derivedStat", stat: "armorRating", value: 10, isPercent: true },
]);

assertEffects(parseBonusEffects("You take 10% less damage while power attacking, drawing a bow, or blocking."), []);

assertEffects(parseBonusEffects("[20% more melee damage]"), [
  { type: "derivedStat", stat: "meleeDamage", value: 20, isPercent: true },
]);

assertEffects(
  parseBonusEffects(
    "You take 50% more physical damage and have 100% weakness to Poison. However you start with +50 health and gain +5 health per level.",
  ),
  [
    { type: "derivedStat", stat: "poisonResist", value: -100, isPercent: true },
    { type: "derivedStat", stat: "damageTaken", value: 50, isPercent: true },
    { type: "attribute", stat: "health", value: 50 },
  ],
);

assertEffects(parseBonusEffects("All spells cost 60% less but are 40% weaker or last 40% shorter."), [
  { type: "derivedStat", stat: "spellCost", value: -60, isPercent: true },
  { type: "derivedStat", stat: "spellDamage", value: -40, isPercent: true },
  { type: "derivedStat", stat: "spellDuration", value: -40, isPercent: true },
]);

assertEffects(
  parseBonusEffects(
    "You swim 10% faster, can breath underwater and regenerate health, stamina and magicka by a flat 1 per second when wet.",
  ),
  [
    { type: "derivedStat", stat: "swimmingSpeed", value: 10, isPercent: true },
    { type: "flag", stat: "waterbreathing" },
  ],
);

assertEffects(parseBonusEffects("Start with 50 less Health, Magicka and Stamina."), [
  { type: "attribute", stat: "health", value: -50 },
  { type: "attribute", stat: "magicka", value: -50 },
  { type: "attribute", stat: "stamina", value: -50 },
]);

assertEffects(parseBonusEffects("However, you start with 100 less Magicka."), [
  { type: "attribute", stat: "magicka", value: -100 },
]);

assert.deepEqual(
  extractConditionalBonusDetails(
    "For every 5 book or notes read, gain 1 point of Magicka, for up to 300 Magicka at 1500 read. However, you start with 100 less Magicka.",
    parseBonusEffects(
      "For every 5 book or notes read, gain 1 point of Magicka, for up to 300 Magicka at 1500 read. However, you start with 100 less Magicka.",
    ),
  ),
  ["For every 5 book or notes read.", "For up to 300 Magicka at 1500 read."],
);

console.log("parse-bonus-effects: ok");
