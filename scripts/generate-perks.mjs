import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "data/game/perks");

const GRID_SIZE = 25;

const SKILL_IDS = [
  "smithing",
  "heavy-armor",
  "block",
  "two-handed",
  "one-handed",
  "marksman",
  "evasion",
  "sneak",
  "wayfarer",
  "finesse",
  "speech",
  "alchemy",
  "illusion",
  "conjuration",
  "destruction",
  "restoration",
  "alteration",
  "enchanting",
  "destiny",
  "traits",
];

const SKILL_NAMES = [
  "Smithing",
  "Heavy Armor",
  "Block",
  "Two-Handed",
  "One-Handed",
  "Marksman",
  "Evasion",
  "Sneak",
  "Wayfarer",
  "Finesse",
  "Speech",
  "Alchemy",
  "Illusion",
  "Conjuration",
  "Destruction",
  "Restoration",
  "Alteration",
  "Enchanting",
  "Destiny",
  "Traits",
];

const GENERATE_SKILL_INDICES = SKILL_IDS.slice(0, 18).map((_, i) => i);

const freePerkSourceIndices = new Set(
  JSON.parse(readFileSync(join(root, "data/game/perk-free-indices.json"), "utf8")),
);

function cleanName(name) {
  return name.replace(/<br\s*\/?>/gi, " ").replace(/\s+/g, " ").trim();
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function toGridCoord(percent) {
  return Math.max(0, Math.min(GRID_SIZE - 1, Math.round((percent / 100) * (GRID_SIZE - 1))));
}

function parsePlayerLevelRequirement(description) {
  const match = description.match(/Requires Level (\d+)/i);
  if (!match) return undefined;

  const level = Number(match[1]);
  return Number.isNaN(level) ? undefined : level;
}

function cleanDescription(description) {
  return description
    .replace(/\s*[[(]\s*Requires Level \d+\s*[\])]\s*/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function loadPerkData() {
  const raw = readFileSync(join(__dirname, "giga-perkListData.js"), "utf8");
  const objectText = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  return eval(`(${objectText})`);
}

const perkData = loadPerkData();
const playerLevelReqsById = JSON.parse(
  readFileSync(join(root, "data/game/perk-player-level-reqs.json"), "utf8"),
);
const globalUsedIds = new Set();
const indexToId = new Array(perkData.perks.length);

for (let index = 0; index < perkData.perks.length; index++) {
  const perk = perkData.perks[index];
  const skillId = SKILL_IDS[perk.skill];
  const base = slugify(cleanName(perk.name)) || `perk-${index}`;
  let id = `${skillId}-${base}`;
  let suffix = 2;
  while (globalUsedIds.has(id)) {
    id = `${skillId}-${base}-${suffix++}`;
  }
  globalUsedIds.add(id);
  indexToId[index] = id;
}

mkdirSync(outDir, { recursive: true });

const indexEntries = {};

for (const skillIndex of GENERATE_SKILL_INDICES) {
  const skillId = SKILL_IDS[skillIndex];
  const skillName = SKILL_NAMES[skillIndex];
  const perks = [];

  for (let index = 0; index < perkData.perks.length; index++) {
    const source = perkData.perks[index];
    if (source.skill !== skillIndex) continue;

    const prerequisites = [];
    const prerequisitesAny = [];

    for (const req of source.preReqs ?? []) {
      const targetId = indexToId[Math.abs(req)];
      if (!targetId) continue;
      if (req < 0) prerequisitesAny.push(targetId);
      else prerequisites.push(targetId);
    }

    const description = cleanDescription(source.description ?? "");
    const playerLevelReq =
      source.playerLevelReq ??
      playerLevelReqsById[indexToId[index]] ??
      parsePlayerLevelRequirement(source.description ?? "");
    const costsPerkPoint = !freePerkSourceIndices.has(index);

    perks.push({
      id: indexToId[index],
      name: cleanName(source.name),
      skillReq: source.skillReq ?? 0,
      ...(playerLevelReq !== undefined ? { playerLevelReq } : {}),
      ...(costsPerkPoint ? {} : { costsPerkPoint: false }),
      position: {
        x: toGridCoord(source.xPos),
        y: toGridCoord(source.yPos),
      },
      prerequisites,
      ...(prerequisitesAny.length > 0 ? { prerequisitesAny } : {}),
      description,
      effects: [],
    });
  }

  const tree = {
    skillId,
    skillName,
    grid: { width: GRID_SIZE, height: GRID_SIZE },
    perks,
  };

  const filename = `${skillId}.json`;
  writeFileSync(join(outDir, filename), `${JSON.stringify(tree, null, 2)}\n`);
  indexEntries[skillId] = filename;
  console.log(`Wrote ${filename} (${perks.length} perks)`);
}

writeFileSync(
  join(outDir, "index.json"),
  `${JSON.stringify(indexEntries, null, 2)}\n`,
);

console.log(`Done. Generated ${Object.keys(indexEntries).length} skill trees.`);
