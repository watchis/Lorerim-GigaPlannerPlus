import { readFileSync } from "node:fs";
import { join } from "node:path";
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
import { collectTraitAbilitySpells } from "./trait-ability-list.mjs";
import { extractConditionalBonusDetails } from "./parse-bonus-effects.mjs";
import { parseBonusEffects } from "./parse-bonus-effects.mjs";
import { detectLorerimVersion } from "./lorerim-version.mjs";
import { collectDisplayedPerkRecords } from "./perk-import-filter.mjs";
import {
  appendMissingPerkNodes,
  buildPerkPlayerLevelReqs,
  normalizeStackPrerequisites,
} from "./append-missing-perks.mjs";
import { pruneAllPerkTrees } from "./prune-orphan-perks.mjs";
import { collectWorshipAltarKeys, resolveDeityEligibility } from "./deity-eligibility.mjs";
import { extractFaithEffectsFromPlugins, indexDeityFaithMgef } from "./deity-faith-from-plugins.mjs";
import {
  BIRTHSIGN_NAMES,
  DESTINY_SKILL_ID,
  PLAYABLE_RACE_EDIDS,
  RACE_DISPLAY_NAMES,
  RACE_ID_MAP,
  birthsignIdFromName,
  blessingIdFromName,
  blessingNameFromSpell,
  buildAltarBlessingSpellIndex,
  buildBirthsignMesgLookup,
  buildDestinyTree,
  buildRaceAbilityLookup,
  buildRaceEffectsFromRaces,
  cleanRaceDescription,
  collectRaceBonuses,
  findPriorRace,
  hasDeityFaithEffects,
  mergeImportedRaceStats,
  mergeRaceBonuses,
  parseBirthsignBody,
  parseBirthsignMesg,
  parseBlessingRequirement,
  parseRaceData,
  resolveTraitText,
} from "./lorerim-content-parse.mjs";

export {
  buildDestinyTree,
  buildRaceEffectsFromRaces,
  resolveTraitText,
} from "./lorerim-content-parse.mjs";

function buildPerkLookups(perkRecords, membership) {
  const treePerkRecords = collectDisplayedPerkRecords(perkRecords, membership);
  return { treePerkRecords };
}

export function transformPerkRecords(
  perkRecords,
  perksDir,
  installDir = null,
  metadataIndex = null,
  membership = null,
) {
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
  trees["destiny.json"] = buildDestinyTree(perkRecords, installDir, existingDestiny);

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
    normalizeStackPrerequisites(tree);
  }
  const playerLevelReqs = mergePerkPlayerLevelReqs(
    trees,
    buildPerkPlayerLevelReqs(trees),
    existingLevelReqsByGraphKey,
  );

  return { trees, indexEntries, addedPerks, removedPerks, playerLevelReqs };
}

export async function transformTraitRecords(spellRecords, install = null, plugins = [], scanContext = {}) {
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

export function transformRaceRecords(
  raceRecords,
  spellRecords,
  racesPath,
  lorerimRaceRecords = [],
) {
  const existing = JSON.parse(readFileSync(racesPath, "utf8"));
  const existingById = new Map(existing.races.map((race) => [race.id, race]));
  const abilityLookup = buildRaceAbilityLookup(spellRecords);
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
      const importedBonuses = collectRaceBonuses(record.edid, abilityLookup);
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

export function transformStandingStoneRecords(spellRecords, mesgRecords, birthsignsPath) {
  const existing = JSON.parse(readFileSync(birthsignsPath, "utf8"));
  const existingEntries = existing.birthsigns ?? existing.standingStones ?? [];
  const existingById = new Map(existingEntries.map((birthsign) => [birthsign.id, birthsign]));
  const spellByEdid = new Map(spellRecords.map((record) => [record.edid, record]));
  const mesgByStone = buildBirthsignMesgLookup(mesgRecords);

  const birthsigns = [];

  for (const stoneName of BIRTHSIGN_NAMES) {
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

export function transformDeityRecords(
  spellRecords,
  mgefRecords,
  mesgRecords,
  deitiesPath,
  altarMagnitudes = new Map(),
  deityEligibility = new Map(),
  boonMagnitudes = new Map(),
) {
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

// Re-export skill constants used by import scripts.
export { SKILL_IDS, SKILL_NAMES };
