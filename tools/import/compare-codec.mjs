import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { gzipSync } from "fflate";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function loadJson(path) {
  return JSON.parse(readFileSync(join(root, path), "utf8"));
}

function toBase64Url(bytes) {
  return Buffer.from(bytes).toString("base64url");
}

function collectPerkIds(manifest, perkTrees) {
  const ids = [];
  for (const skillId of manifest.skills) {
    for (const perk of perkTrees[skillId]?.perks ?? []) {
      ids.push(perk.id);
    }
  }
  return ids;
}

function indexById(ids) {
  return new Map(ids.map((id, index) => [id, index]));
}

function encodeV1(state, version) {
  const payload = {
    v: 1,
    mv: version,
    race: state.raceId,
    stone: state.birthsignId,
    blessing: state.deityId,
    traits: state.traitIds,
    major: state.majorSkillIds,
    minor: state.minorSkillIds,
    attrs: [state.attributeBonus.health, state.attributeBonus.magicka, state.attributeBonus.stamina],
    perks: state.selectedPerkIds,
    desc: state.description,
  };
  return toBase64Url(Buffer.from(JSON.stringify(payload), "utf8"));
}

function encodeV2(state, registry) {
  const payload = { v: 2, mv: registry.modpackVersion };
  const raceId = state.raceId ?? "none";
  if (raceId !== "none") payload.r = registry.raceIndex.get(raceId);
  if (state.birthsignId) payload.s = registry.birthsignIndex.get(state.birthsignId);
  if (state.deityId) payload.b = registry.deityIndex.get(state.deityId);
  if (state.traitIds.length) payload.t = state.traitIds.map((id) => registry.traitIndex.get(id));
  if (state.majorSkillIds.length) payload.M = state.majorSkillIds.map((id) => registry.skillIndex.get(id));
  if (state.minorSkillIds.length) payload.m = state.minorSkillIds.map((id) => registry.skillIndex.get(id));
  const { health, magicka, stamina } = state.attributeBonus;
  if (health || magicka || stamina) payload.a = [health, magicka, stamina];
  if (state.selectedPerkIds.length) {
    payload.p = state.selectedPerkIds.map((id) => registry.perkIndex.get(id)).sort((a, b) => a - b);
  }
  if (state.description.trim()) payload.d = state.description;
  const compressed = gzipSync(Buffer.from(JSON.stringify(payload), "utf8"));
  return `2.${toBase64Url(compressed)}`;
}

const manifest = loadJson("data/game/manifest.json");
const races = loadJson("data/game/races.json").races.map((r) => r.id);
const birthsigns = loadJson("data/game/birthsigns.json").birthsigns.map((s) => s.id);
const deities = loadJson("data/game/deities.json").deities.map((b) => b.id);
const traits = loadJson("data/game/traits.json").traits.map((t) => t.id);
const skills = loadJson("data/game/skills.json").skills.map((s) => s.id);
const perkIndex = loadJson("data/game/perks/index.json");
const perkTrees = {};
for (const [skillId, file] of Object.entries(perkIndex)) {
  perkTrees[skillId] = loadJson(`data/game/perks/${file}`);
}
const perks = collectPerkIds(manifest, perkTrees);

const registry = {
  modpackVersion: manifest.version,
  raceIndex: indexById(races),
  birthsignIndex: indexById(birthsigns),
  deityIndex: indexById(deities),
  traitIndex: indexById(traits),
  skillIndex: indexById(skills),
  perkIndex: indexById(perks),
};

const samples = [
  {
    name: "Empty build",
    state: {
      raceId: "none",
      birthsignId: null,
      deityId: null,
      traitIds: [],
      majorSkillIds: [],
      minorSkillIds: [],
      attributeBonus: { health: 0, magicka: 0, stamina: 0 },
      selectedPerkIds: [],
      description: "",
    },
  },
  {
    name: "Starter character",
    state: {
      raceId: "nord",
      birthsignId: "lover",
      deityId: "akatosh",
      traitIds: ["athletic"],
      majorSkillIds: ["one-handed", "heavy-armor", "block"],
      minorSkillIds: ["smithing", "speech", "enchanting", "restoration", "alteration", "destruction"],
      attributeBonus: { health: 0, magicka: 0, stamina: 0 },
      selectedPerkIds: ["craftsmanship", "juggernaut"],
      description: "",
    },
  },
  {
    name: "Heavy perk investment",
    state: {
      raceId: "orc",
      birthsignId: "warrior",
      deityId: "zenithar",
      traitIds: ["athletic", "brute"],
      majorSkillIds: ["heavy-armor", "two-handed", "smithing"],
      minorSkillIds: ["block", "enchanting", "speech", "restoration", "alteration", "destruction"],
      attributeBonus: { health: 2, magicka: 0, stamina: 1 },
      selectedPerkIds: perks.slice(0, 24),
      description: "Two-handed juggernaut",
    },
  },
];

console.log("Build codec size comparison\n");
for (const sample of samples) {
  const v1 = encodeV1(sample.state, manifest.version);
  const v2 = encodeV2(sample.state, registry);
  const savings = Math.round(((v1.length - v2.length) / v1.length) * 100);
  console.log(`${sample.name}:`);
  console.log(`  v1: ${v1.length} chars`);
  console.log(`  v2: ${v2.length} chars (${savings}% shorter)`);
  console.log();
}
