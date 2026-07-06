import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseFaithEffectsCsv } from "./deity-faith-effects.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sampleCsv = readFileSync(join(__dirname, "deity-faith-effects.sample.csv"), "utf8");
const effects = parseFaithEffectsCsv(sampleCsv);

assert.equal(effects.get("mannimarco")?.shrine, "10% Stronger Conjuration Spells");
assert.match(effects.get("mannimarco")?.follower ?? "", /undead last up to 20%/i);
assert.equal(effects.get("the-old-ways")?.shrine, "15% Damage and Crit Against Animals");
assert.equal(effects.get("almalexia")?.shrine, "15 More Health and Stamina");
assert.equal(effects.get("baan-dar")?.name, "Baan Daar");
assert.equal(effects.get("st-alessia")?.name, "St Allesia");
assert.equal(effects.get("the-magna-ge")?.name, "The Magne-Ge");
assert.equal(effects.size, 6);

console.log("deity-faith-effects tests passed");
