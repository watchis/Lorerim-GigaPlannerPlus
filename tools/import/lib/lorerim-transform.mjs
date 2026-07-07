import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadDestinyConfig } from "./destiny-config.mjs";
import { SKILL_IDS, SKILL_NAMES } from "./skill-constants.mjs";
import {
  applyPerkGraphSnapshots,
  applyPerkHandTunedOverrides,
  applyPerkLayoutOverrides,
  applySmithingBookPerkCosts,
  createEmptyPerkTrees,
  loadExistingPerkTree,
  loadPerkGraphSnapshots,
  loadPerkHandTunedOverrides,
  loadPerkLayoutOverrides,
  loadPerkPlayerLevelReqsByGraphKey,
  mergePerkPlayerLevelReqs,
} from "./import-reset.mjs";
import { parseTraitBody } from "./parse-trait-body.mjs";
import { collectTraitAbilitySpells } from "./trait-ability-list.mjs";
import { cleanDescription, cleanName, cleanWintersunEffectText, slugify } from "./transform-utils.mjs";
import { parseBonusEffects, extractConditionalBonusDetails, mergeEffects } from "./parse-bonus-effects.mjs";
import { parseRaceData } from "./race-data-parser.mjs";
import { detectLorerimVersion } from "./lorerim-version.mjs";
import {
  collectDisplayedPerkRecords,
} from "./perk-import-filter.mjs";
import {
  appendMissingPerkNodes,
  buildPerkPlayerLevelReqs,
  normalizeStackPrerequisites,
} from "./append-missing-perks.mjs";
import { pruneAllPerkTrees } from "./prune-orphan-perks.mjs";
import { collectWorshipAltarKeys, deityNameFromAltarKey, normalizeAltarKey, resolveDeityEligibility } from "./deity-eligibility.mjs";
import { extractFaithEffectsFromPlugins, indexDeityFaithMgef } from "./deity-faith-from-plugins.mjs";

const DESTINY_SKILL_ID = "destiny";
const DESTINY_COORD_SCALE = 2;

const PLAYABLE_RACE_EDIDS = new Set([
  "ArgonianRace",
  "BretonRace",
  "DarkElfRace",
  "HighElfRace",
  "ImperialRace",
  "KhajiitRace",
  "NordRace",
  "OrcRace",
  "RedguardRace",
  "WoodElfRace",
]);

const SKILL_SEGMENT_TO_ID = new Map([
  ["Smithing", "smithing"],
  ["HeavyArmor", "heavy-armor"],
  ["Heavy_Armor", "heavy-armor"],
  ["Block", "block"],
  ["TwoHanded", "two-handed"],
  ["Two_Handed", "two-handed"],
  ["OneHanded", "one-handed"],
  ["One_Handed", "one-handed"],
  ["Marksman", "marksman"],
  ["Marksmanship", "marksman"],
  ["Archery", "marksman"],
  ["LightArmor", "evasion"],
  ["Light_Armor", "evasion"],
  ["Evasion", "evasion"],
  ["Sneak", "sneak"],
  ["Pickpocket", "finesse"],
  ["Lockpicking", "wayfarer"],
  ["Wayfarer", "wayfarer"],
  ["Finesse", "finesse"],
  ["Speech", "speech"],
  ["Alchemy", "alchemy"],
  ["Illusion", "illusion"],
  ["Conjuration", "conjuration"],
  ["Destruction", "destruction"],
  ["Restoration", "restoration"],
  ["Alteration", "alteration"],
  ["Enchanting", "enchanting"],
  ["Destiny", "destiny"],
]);

function normalizePerkName(name) {
  return cleanName(name).toLowerCase();
}

function classifyPerkSkill(edid) {
  if (edid.startsWith("Traits_")) return "traits";

  const body = edid.startsWith("REQ_") ? edid.slice(4) : edid;
  const segment = body.split("_")[0];
  return SKILL_SEGMENT_TO_ID.get(segment) ?? null;
}

function buildPerkLookups(perkRecords, membership) {
  const treePerkRecords = collectDisplayedPerkRecords(perkRecords, membership);
  return { treePerkRecords };
}

function darPerkSuffixName(edid) {
  const suffix = edid.replace(/^DAR_Perk\d+/, "");
  if (!suffix) return "";
  return suffix.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function darPerkDisplayName(record, usedNames) {
  const fullName = cleanName(record.name);
  if (fullName) {
    const key = fullName.toLowerCase();
    if (!usedNames.has(key)) {
      usedNames.add(key);
      return fullName;
    }
  }

  const fallback = cleanName(darPerkSuffixName(record.edid));
  if (fallback) {
    usedNames.add(fallback.toLowerCase());
    return fallback;
  }

  return fullName || record.edid;
}

function buildDarDisplayNames(darPerks) {
  const usedNames = new Set();
  return darPerks.map((record) => darPerkDisplayName(record, usedNames));
}

function darPerkSortKey(edid) {
  const match = edid.match(/^DAR_Perk(\d+)/i);
  return match ? Number.parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
}

function collectDarPerkRecords(perkRecords) {
  return perkRecords
    .filter((record) => record.edid.startsWith("DAR_Perk"))
    .sort((left, right) => darPerkSortKey(left.edid) - darPerkSortKey(right.edid));
}

function destinyPerkId(sequence) {
  return `${DESTINY_SKILL_ID}-${String(sequence).padStart(2, "0")}`;
}

function normalizeDestinyGrid(perks) {
  if (perks.length === 0) {
    return { perks, grid: { width: 1, height: 1 } };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const perk of perks) {
    minX = Math.min(minX, perk.position.x);
    minY = Math.min(minY, perk.position.y);
    maxX = Math.max(maxX, perk.position.x);
    maxY = Math.max(maxY, perk.position.y);
  }

  for (const perk of perks) {
    perk.position = {
      x: perk.position.x - minX,
      y: perk.position.y - minY,
    };
  }

  return {
    perks,
    grid: {
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    },
  };
}

function buildDestinyTreeFromConfig(darPerks, configNodes, existingTree) {
  const enabledNodes = configNodes
    .filter((node) => node.enabled && node.index > 0)
    .sort((left, right) => left.index - right.index);

  const existingById = new Map(existingTree.perks.map((perk) => [perk.id, perk]));
  const displayNames = buildDarDisplayNames(darPerks);
  const nodeIndexToPerkId = new Map();
  const perks = [];

  for (const [index, node] of enabledNodes.entries()) {
    const record = darPerks[index];
    if (!record) break;

    const sequence = index + 1;
    const fallbackId = destinyPerkId(sequence);
    const existing =
      existingById.get(fallbackId) ??
      existingTree.perks.find((perk) => perk.id.endsWith(`-${String(sequence).padStart(2, "0")}`));
    const id = existing?.id ?? fallbackId;
    const name = displayNames[index] ?? cleanName(record.name || record.edid);
    const description = cleanDescription(record.description ?? existing?.description ?? "");

    nodeIndexToPerkId.set(node.index, id);
    perks.push({
      id,
      name,
      skillReq: 0,
      ...(existing?.costsPerkPoint === false ? { costsPerkPoint: false } : {}),
      position: {
        x: Math.round(node.x * DESTINY_COORD_SCALE),
        y: Math.round(node.y * DESTINY_COORD_SCALE),
      },
      prerequisites: [],
      prerequisitesAny: [],
      description,
      effects: existing?.effects?.length ? existing.effects : parseBonusEffects(description),
    });
  }

  for (const node of enabledNodes) {
    const parentId = nodeIndexToPerkId.get(node.index);
    if (!parentId) continue;

    for (const childIndex of node.links) {
      const childId = nodeIndexToPerkId.get(childIndex);
      if (!childId || childId === parentId) continue;

      const childPerk = perks.find((perk) => perk.id === childId);
      if (childPerk && !childPerk.prerequisitesAny.includes(parentId)) {
        childPerk.prerequisitesAny.push(parentId);
      }
    }
  }

  const normalized = normalizeDestinyGrid(perks);
  return {
    skillId: DESTINY_SKILL_ID,
    skillName: "Destiny",
    ...normalized,
  };
}

function buildFallbackDestinyTree(darPerks, existingTree) {
  const existingById = new Map(existingTree.perks.map((perk) => [perk.id, perk]));
  const displayNames = buildDarDisplayNames(darPerks);
  const columnWidth = 7;
  const perks = darPerks.map((record, index) => {
    const sequence = index + 1;
    const fallbackId = destinyPerkId(sequence);
    const existing = existingById.get(fallbackId);
    const name = displayNames[index] ?? cleanName(record.name || record.edid);

    return {
      id: existing?.id ?? fallbackId,
      name,
      skillReq: 0,
      ...(existing?.costsPerkPoint === false ? { costsPerkPoint: false } : {}),
      position: {
        x: index % columnWidth,
        y: Math.floor(index / columnWidth),
      },
      prerequisites: [],
      prerequisitesAny: [],
      description: cleanDescription(record.description ?? existing?.description ?? ""),
      effects: existing?.effects?.length
        ? existing.effects
        : parseBonusEffects(cleanDescription(record.description ?? existing?.description ?? "")),
    };
  });

  const normalized = normalizeDestinyGrid(perks);
  return {
    skillId: DESTINY_SKILL_ID,
    skillName: "Destiny",
    ...normalized,
  };
}

function buildDestinyTree(perkRecords, installDir, existingTree) {
  const darPerks = collectDarPerkRecords(perkRecords);
  if (darPerks.length === 0) return existingTree;

  const configNodes = installDir ? loadDestinyConfig(installDir) : null;
  if (configNodes?.length) {
    return buildDestinyTreeFromConfig(darPerks, configNodes, existingTree);
  }

  return buildFallbackDestinyTree(darPerks, existingTree);
}

export function transformPerkRecords(
  perkRecords,
  perksDir,
  installDir = null,
  metadataIndex = null,
  membership = null,
  options = {},
) {
  const onProgress = options.onProgress;
  const handTunedOverrides = loadPerkHandTunedOverrides(perksDir);
  const layoutOverrides = loadPerkLayoutOverrides(perksDir);
  const graphSnapshots = loadPerkGraphSnapshots(perksDir);
  const existingLevelReqsByGraphKey = loadPerkPlayerLevelReqsByGraphKey(perksDir);
  const { trees, indexEntries } = createEmptyPerkTrees();
  const { treePerkRecords } = buildPerkLookups(perkRecords, membership);

  const existingDestiny =
    loadExistingPerkTree(perksDir, "destiny.json") ?? {
      skillId: DESTINY_SKILL_ID,
      skillName: "Destiny",
      grid: { width: 1, height: 1 },
      perks: [],
    };
  onProgress?.("Perk trees", "Destiny");
  trees["destiny.json"] = buildDestinyTree(perkRecords, installDir, existingDestiny);

  onProgress?.("Perk trees", "missing perks");
  const addedPerks = appendMissingPerkNodes(
    trees,
    treePerkRecords,
    metadataIndex,
    membership,
    perkRecords,
  );
  applyPerkHandTunedOverrides(trees, handTunedOverrides);
  applySmithingBookPerkCosts(trees);
  const removedPerks = pruneAllPerkTrees(trees, { membership });
  applyPerkLayoutOverrides(trees, layoutOverrides);
  applyPerkGraphSnapshots(trees, graphSnapshots);
  for (const tree of Object.values(trees)) {
    onProgress?.("Perk trees", tree.skillName || tree.skillId || "tree");
    normalizeStackPrerequisites(tree);
  }
  const playerLevelReqs = mergePerkPlayerLevelReqs(
    trees,
    buildPerkPlayerLevelReqs(trees),
    existingLevelReqsByGraphKey,
  );

  return { trees, indexEntries, addedPerks, removedPerks, playerLevelReqs };
}

function resolveTraitText(spellRecord) {
  const name = cleanName(spellRecord.name);
  const id = slugify(name);
  const rawText = cleanDescription(spellRecord.description || "");
  if (!rawText) {
    return { id, name, description: "", bonus: "" };
  }

  const parsed = parseTraitBody(rawText);
  return { id, name, ...parsed };
}

export async function transformTraitRecords(spellRecords, install = null, plugins = [], scanContext = {}) {
  const onProgress = scanContext.onProgress;
  onProgress?.("Traits", "collecting");
  const traitSpells =
    install && plugins.length > 0
      ? await collectTraitAbilitySpells(
          plugins,
          install.installDir,
          install.enabledMods,
          spellRecords,
          {
            traitsFormList: scanContext.traitsFormList,
            mastersByPath: scanContext.mastersByPath,
          },
        )
      : spellRecords.filter(
          (record) =>
            /^(Traits_|LoreTraits_|LoreRim_)\w+Ab$/i.test(record.edid) && record.name,
        );

  const traits = [];

  for (const spell of traitSpells) {
    const { id, name, description, bonus } = resolveTraitText(spell);
    onProgress?.("Traits", name);
    const effects = parseBonusEffects(bonus);

    traits.push({
      id,
      name,
      description,
      bonus,
      effects,
      bonusDetails: extractConditionalBonusDetails(bonus, effects),
    });
  }

  traits.sort((left, right) => left.name.localeCompare(right.name));
  return { traits };
}

const RACE_ID_MAP = {
  ArgonianRace: "argonian",
  BretonRace: "breton",
  DarkElfRace: "dunmer",
  HighElfRace: "altmer",
  ImperialRace: "imperial",
  KhajiitRace: "khajiit",
  NordRace: "nord",
  OrcRace: "orsimer",
  RedguardRace: "redguard",
  WoodElfRace: "bosmer",
};

const RACE_DISPLAY_NAMES = {
  DarkElfRace: "Dunmer",
  HighElfRace: "Altmer",
  OrcRace: "Orsimer",
  WoodElfRace: "Bosmer",
};

const RACE_ABILITY_SEGMENT = {
  ArgonianRace: "Argonian",
  BretonRace: "Breton",
  DarkElfRace: "Dunmer",
  HighElfRace: "Altmer",
  ImperialRace: "Imperial",
  KhajiitRace: "Khajiit",
  NordRace: "Nord",
  OrcRace: "Orsimer",
  RedguardRace: "Redguard",
  WoodElfRace: "Bosmer",
};

const SHARED_RACE_ABILITIES = {
  ArgonianRace: ["All_StrongStomach"],
  WoodElfRace: ["All_StrongStomach"],
  KhajiitRace: ["All_StrongStomach", "All_Claws"],
  OrcRace: ["All_StrongStomach"],
};

function buildRaceAbilityLookup(spellRecords) {
  const byKey = new Map();

  for (const record of spellRecords) {
    if (!record.edid.startsWith("REQ_Ability_Race_")) continue;
    byKey.set(record.edid.slice("REQ_Ability_Race_".length), record);
  }

  return byKey;
}

function raceBonusLabel(record) {
  const name = cleanName(record.name);
  const description = cleanWintersunEffectText(record.description);
  return description ? `${name}: ${description}` : name;
}

function raceBonusName(bonus) {
  return bonus.split(":")[0]?.trim().toLowerCase() ?? "";
}

function mergeRaceBonuses(imported, prior = []) {
  if (imported.length === 0) return prior;

  const importedNames = new Set(imported.map(raceBonusName));
  const preserved = prior.filter((bonus) => !importedNames.has(raceBonusName(bonus)));
  return [...imported, ...preserved];
}

function collectRaceBonuses(raceEdid, abilityByKey) {
  const segment = RACE_ABILITY_SEGMENT[raceEdid];
  if (!segment) return [];

  const bonuses = [];

  for (const [key, record] of abilityByKey) {
    if (!key.startsWith(`${segment}_`) || key.endsWith("_Buff")) continue;
    bonuses.push(raceBonusLabel(record));
  }

  for (const sharedKey of SHARED_RACE_ABILITIES[raceEdid] ?? []) {
    const record = abilityByKey.get(sharedKey);
    if (record) bonuses.push(raceBonusLabel(record));
  }

  return bonuses.sort((left, right) => raceBonusName(left).localeCompare(raceBonusName(right)));
}

function cleanRaceDescription(description, raceEdid) {
  let cleaned = cleanDescription(description);
  if (raceEdid === "OrcRace") {
    cleaned = cleaned.replace(/\s*Berserk rage[^.]*\./gi, "").trim();
  }
  return cleaned;
}

function findPriorRace(existingById, id, raceEdid) {
  return (
    existingById.get(id) ??
    (raceEdid === "OrcRace" ? existingById.get("orc") : undefined)
  );
}

function mergeImportedRaceStats(prior, importedStats) {
  if (!importedStats) return {};

  return {
    startingAttributes: importedStats.startingAttributes,
    startingCarryWeight: importedStats.startingCarryWeight,
    unarmedDamage: importedStats.unarmedDamage,
    regen: importedStats.regen,
    startingSkills: {
      ...importedStats.startingSkills,
      destiny: prior?.startingSkills?.destiny ?? 1,
      traits: prior?.startingSkills?.traits ?? 0,
    },
  };
}

export function buildRaceEffectsFromRaces(races) {
  const raceEffects = {};

  for (const race of races) {
    if (race.id === "none") continue;
    raceEffects[race.id] = mergeEffects(
      ...race.bonuses.map((bonus) => parseBonusEffects(bonus)),
    );
  }

  return raceEffects;
}

export function transformRaceRecords(
  raceRecords,
  spellRecords,
  racesPath,
  lorerimRaceRecords = [],
  options = {},
) {
  const onProgress = options.onProgress;
  const existing = JSON.parse(readFileSync(racesPath, "utf8"));
  const existingById = new Map(existing.races.map((race) => [race.id, race]));
  const abilityByKey = buildRaceAbilityLookup(spellRecords);
  const lorerimByEdid = new Map(
    lorerimRaceRecords
      .filter((record) => PLAYABLE_RACE_EDIDS.has(record.edid))
      .map((record) => [record.edid, record]),
  );

  const races = raceRecords
    .filter((record) => PLAYABLE_RACE_EDIDS.has(record.edid))
    .map((record) => {
      const id = RACE_ID_MAP[record.edid];
      const prior = findPriorRace(existingById, id, record.edid);
      const source = lorerimByEdid.get(record.edid) ?? record;
      const displayName = RACE_DISPLAY_NAMES[record.edid] || source.name || prior?.name || id;
      onProgress?.("Races", displayName);
      const importedBonuses = collectRaceBonuses(record.edid, abilityByKey);
      const bonuses = mergeRaceBonuses(importedBonuses, prior?.bonuses ?? []);
      const importedStats = mergeImportedRaceStats(prior, parseRaceData(source.data));

      return {
        ...(prior ?? {
          id,
          name: RACE_DISPLAY_NAMES[record.edid] ?? source.name,
          description: "",
          bonuses: [],
          startingAttributes: { health: 0, magicka: 0, stamina: 0 },
          attributeBonus: { health: 0, magicka: 0, stamina: 0 },
          startingCarryWeight: 0,
          speedBonus: 0,
          unarmedDamage: 0,
          regen: { health: 0, magicka: 0, stamina: 0 },
          startingSkills: {},
          effects: [],
        }),
        ...importedStats,
        id,
        name: RACE_DISPLAY_NAMES[record.edid] || source.name || prior?.name || id,
        description: cleanRaceDescription(
          source.description ?? prior?.description ?? "",
          record.edid,
        ),
        bonuses,
        effects: [],
      };
    });

  const none = existing.races.find((race) => race.id === "none");
  const playableRaces = none ? [none, ...races] : races;
  return {
    races: { races: playableRaces },
    raceEffects: buildRaceEffectsFromRaces(races),
  };
}

export function transformManifestFromInstall(existingManifest, installDir) {
  const detected = detectLorerimVersion(installDir);
  const version = detected.version ?? existingManifest?.version ?? null;

  return {
    ...existingManifest,
    name: "LoreRim",
    ...(version ? { version } : {}),
  };
}

const BIRTHSIGN_NAMES = [
  "Apprentice",
  "Atronach",
  "Lady",
  "Lord",
  "Lover",
  "Mage",
  "Ritual",
  "Serpent",
  "Shadow",
  "Steed",
  "Thief",
  "Tower",
  "Warrior",
];

function birthsignIdFromName(name) {
  return slugify(name);
}

function cleanBirthsignText(text) {
  return cleanDescription(String(text ?? ""))
    .replace(/<([^<>]+)>/g, "$1")
    .replace(/\s*Accept the sign of the [^.?]+\?\s*$/i, "")
    .trim();
}

function parseBirthsignBody(text) {
  const cleaned = cleanBirthsignText(text);
  if (!cleaned) return { description: "", bonus: "" };

  const mechanicalStart = cleaned.search(
    /\.\s+(?:\d+%|Magicka|Magic|Health|Stamina|Movement|Sprinting?|Gain|Armor|Pickpocket|Lockpicking|Soul Gems|Daedric|Standing Stones|You are|Prices|Shouts|Spells|Reflect|Poison|Most|Improved|You receive|You do not|absorb|do not lose)/i,
  );

  if (mechanicalStart === -1) {
    return { description: cleaned, bonus: "" };
  }

  return {
    description: cleaned.slice(0, mechanicalStart + 1).trim(),
    bonus: cleaned.slice(mechanicalStart + 2).trim(),
  };
}

function parseBirthsignMesg(description) {
  const sections = String(description ?? "")
    .split(/\r?\n\r?\n/)
    .map((section) => cleanBirthsignText(section))
    .filter(Boolean);

  const group = sections[0] ?? "";
  const body = sections.slice(1).join(" ");
  const { description: flavor, bonus } = parseBirthsignBody(body);

  return { group, description: flavor, bonus };
}

function isBirthsignAbilitySpell(record) {
  if (!record.edid.startsWith("REQ_Ability_Birthsign_")) return false;
  const suffix = record.edid.slice("REQ_Ability_Birthsign_".length);
  return BIRTHSIGN_NAMES.includes(suffix);
}

function buildBirthsignMesgLookup(mesgRecords) {
  const byStone = new Map();

  for (const record of mesgRecords) {
    const match = record.edid.match(/^doom([A-Za-z]+)MSG$/);
    if (!match || match[1] === "AlreadyHave" || match[1].endsWith("Removed")) continue;
    if (!BIRTHSIGN_NAMES.includes(match[1])) continue;
    byStone.set(match[1], record);
  }

  return byStone;
}

export function transformStandingStoneRecords(spellRecords, mesgRecords, birthsignsPath, options = {}) {
  const onProgress = options.onProgress;
  const existing = JSON.parse(readFileSync(birthsignsPath, "utf8"));
  const existingEntries = existing.birthsigns ?? existing.standingStones ?? [];
  const existingById = new Map(existingEntries.map((birthsign) => [birthsign.id, birthsign]));
  const spellByEdid = new Map(spellRecords.map((record) => [record.edid, record]));
  const mesgByStone = buildBirthsignMesgLookup(mesgRecords);

  const birthsigns = [];

  for (const stoneName of BIRTHSIGN_NAMES) {
    onProgress?.("Birthsigns", stoneName);
    const id = birthsignIdFromName(stoneName);
    const prior = existingById.get(id);
    const spell = spellByEdid.get(`REQ_Ability_Birthsign_${stoneName}`);
    const mesg = mesgByStone.get(stoneName);

    const fromMesg = mesg?.description ? parseBirthsignMesg(mesg.description) : null;
    const fromSpell = spell?.description ? parseBirthsignBody(spell.description) : null;

    const bonus = fromMesg?.bonus || fromSpell?.bonus || prior?.bonus || "";
    const effects = parseBonusEffects(bonus);

    birthsigns.push({
      ...(prior ?? {
        id,
        name: stoneName,
        group: "",
        description: "",
        bonus: "",
        effects: [],
      }),
      id,
      name: stoneName,
      group: fromMesg?.group || prior?.group || "",
      description: fromMesg?.description || fromSpell?.description || prior?.description || "",
      bonus,
      effects,
      bonusDetails: extractConditionalBonusDetails(bonus, effects),
    });
  }

  const none = existingEntries.find((birthsign) => birthsign.id === "none");
  return { birthsigns: none ? [none, ...birthsigns] : birthsigns };
}

function blessingIdFromName(spellName, altarKey = "") {
  const match = cleanName(spellName).match(/^Blessing of (.+)$/i);
  if (match) return slugify(match[1]);
  if (altarKey) return slugify(deityNameFromAltarKey(altarKey));
  return slugify(spellName);
}

function blessingNameFromSpell(spellName, altarKey = "") {
  const match = cleanName(spellName).match(/^Blessing of (.+)$/i);
  if (match) return match[1];
  if (altarKey) return deityNameFromAltarKey(altarKey);
  return cleanName(spellName);
}

function parseBlessingRequirement(failMessage) {
  const text = cleanDescription(failMessage ?? "");
  if (!text) return { requirement: "None", race: "All" };

  if (/does not accept those who have not served/i.test(text)) {
    return { requirement: "Must have served this deity", race: "All" };
  }

  const raceMatch = text.match(/only accepts those of (.+?) blood/i);
  if (raceMatch) {
    return {
      requirement: "Race restricted",
      race: raceMatch[1].replace(/\s+or\s+/gi, " / ").replace(/\s+and\s+/gi, " / "),
    };
  }

  if (/does not accept those who are not of Human blood/i.test(text)) {
    return { requirement: "Human blood", race: "Human" };
  }

  return { requirement: text, race: "All" };
}

function isAltarBlessingSpell(record) {
  return (
    record.edid.startsWith("WSN_AltarBlessing_") &&
    record.edid.endsWith("_Spell") &&
    !record.edid.includes("Gift")
  );
}

function isVariantAltarBlessingSpell(record) {
  return /Gift|Cloak|BuffOnly|NoAutocast/i.test(record.edid);
}

function altarKeyFromSpellEdid(edid) {
  const rawKey = edid.slice("WSN_AltarBlessing_".length, -"_Spell".length);
  return normalizeAltarKey(rawKey);
}

function buildAltarBlessingSpellIndex(spellRecords) {
  const byAltarKey = new Map();

  for (const record of spellRecords.filter(isAltarBlessingSpell)) {
    const altarKey = altarKeyFromSpellEdid(record.edid);
    const existing = byAltarKey.get(altarKey);
    if (!existing || (isVariantAltarBlessingSpell(existing) && !isVariantAltarBlessingSpell(record))) {
      byAltarKey.set(altarKey, record);
    }
  }

  return byAltarKey;
}

function hasDeityFaithEffects({ shrine, follower, devotee }) {
  for (const value of [shrine, follower, devotee]) {
    const text = String(value ?? "").trim();
    if (text && text !== "-") return true;
  }
  return false;
}

export function transformDeityRecords(
  spellRecords,
  mgefRecords,
  mesgRecords,
  deitiesPath,
  altarMagnitudes = new Map(),
  deityEligibility = new Map(),
  boonMagnitudes = new Map(),
  options = {},
) {
  const onProgress = options.onProgress;
  const existing = JSON.parse(readFileSync(deitiesPath, "utf8"));
  const existingEntries = existing.deities ?? existing.blessings ?? [];
  const existingById = new Map(existingEntries.map((deity) => [deity.id, deity]));
  const mgefIndex = indexDeityFaithMgef(mgefRecords);
  const mesgByEdid = new Map(mesgRecords.map((record) => [record.edid, record]));
  const spellByAltarKey = buildAltarBlessingSpellIndex(spellRecords);
  const altarKeys = new Set([...collectWorshipAltarKeys(mesgRecords), ...spellByAltarKey.keys()]);

  const deities = [];

  for (const altarKey of altarKeys) {
    const record = spellByAltarKey.get(altarKey);
    const name = blessingNameFromSpell(record?.name ?? "", altarKey);
    onProgress?.("Deities", name);
    const id = blessingIdFromName(record?.name ?? "", altarKey);
    const prior = existingById.get(id);

    const worship = mesgByEdid.get(`WSN_WorshipRequest_Message_${altarKey}`);
    const fail = mesgByEdid.get(`WSN_WorshipRequest_Message_${altarKey}_Fail`);
    const { requirement } = parseBlessingRequirement(fail?.description);
    const altarBlessing = altarMagnitudes.get(altarKey);
    const shrineMagnitudes = altarBlessing?.magnitudes ?? null;
    const shrineMgefEdid = altarBlessing?.shrineMgefEdid ?? null;
    const followerBlessing = boonMagnitudes.get(`${altarKey}:1`);
    const devoteeBlessing = boonMagnitudes.get(`${altarKey}:2`);
    const faithEffects = extractFaithEffectsFromPlugins({
      altarKey,
      mgefIndex,
      worshipDescription: worship?.description,
      altarMagnitudes: shrineMagnitudes,
      shrineMgefEdid,
      followerMagnitudes: followerBlessing?.magnitudes ?? null,
      devoteeMagnitudes: devoteeBlessing?.magnitudes ?? null,
    });
    const eligibility = resolveDeityEligibility(id, name, deityEligibility);

    const shrine = faithEffects.shrine !== "-" ? faithEffects.shrine : "-";
    const follower = faithEffects.follower !== "-" ? faithEffects.follower : prior?.follower || "-";
    const devotee = faithEffects.devotee !== "-" ? faithEffects.devotee : prior?.devotee || "-";

    if (!hasDeityFaithEffects({ shrine, follower, devotee })) {
      continue;
    }

    deities.push({
      ...(prior ?? {
        id,
        name,
        shrine: "-",
        follower: "-",
        devotee: "-",
        tenets: "-",
        race: "All",
        starting: "",
        requirement: "None",
        shrineLocations: [],
        effects: [],
      }),
      id,
      name,
      shrine,
      follower,
      devotee,
      tenets: faithEffects.tenets !== "-" ? faithEffects.tenets : prior?.tenets || "-",
      race: eligibility.race || prior?.race || "All",
      starting: eligibility.starting || prior?.starting || "",
      requirement: eligibility.requirement || requirement || prior?.requirement || "None",
      shrineLocations: eligibility.shrineLocations ?? prior?.shrineLocations ?? [],
      effects: parseBonusEffects(shrine !== "-" ? shrine : "-"),
    });
  }

  deities.sort((left, right) => left.name.localeCompare(right.name));

  const none = existingEntries.find((deity) => deity.id === "none");
  return { deities: none ? [none, ...deities] : deities };
}
