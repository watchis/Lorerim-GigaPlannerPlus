import { readFileSync } from "node:fs";
import { cleanDescription, cleanName } from "../lib/transform-utils.mjs";
import { parseBonusEffects, extractConditionalBonusDetails } from "../lib/parse-bonus-effects.mjs";

const VAMPIRISM_STAGE_EDIDS = [
  { id: "stage-1", edid: "REQ_Vampire_Stage1" },
  { id: "stage-2", edid: "REQ_Vampire_Stage2" },
  { id: "stage-3", edid: "REQ_Vampire_Stage3" },
  { id: "stage-4", edid: "REQ_Vampire_Stage4" },
];

const LYCANTHROPY_FORM_EDIDS = [{ id: "werewolf", edid: "REQ_Werewolf_HumanForm" }];

const VAMPIRISM_RACIAL_PREFIX = "REQ_Vampire_Race_";
const WEREWOLF_RACIAL_PREFIX = "REQ_Werewolf_Race_";

const RACE_EDID_TO_ID = {
  Argonian: "argonian",
  Breton: "breton",
  DarkElf: "dunmer",
  HighElf: "altmer",
  Imperial: "imperial",
  Khajiit: "khajiit",
  Nord: "nord",
  Orc: "orsimer",
  Redguard: "redguard",
  WoodElf: "bosmer",
};

function cleanSupernaturalText(text) {
  return cleanDescription(String(text ?? ""))
    .replace(/<([^<>]+)>/g, "$1")
    .trim();
}

function spellBonusText(record) {
  const name = cleanName(record.name);
  const description = cleanSupernaturalText(record.description);
  return description ? `${name}: ${description}` : name;
}

function parseRacialBonuses(spellRecords, prefix) {
  const bonuses = {};

  for (const record of spellRecords) {
    if (!record.edid.startsWith(prefix)) continue;
    const segment = record.edid.slice(prefix.length);
    const raceId = RACE_EDID_TO_ID[segment];
    if (!raceId) continue;

    const text = spellBonusText(record);
    const colonIndex = text.indexOf(":");
    const name = colonIndex === -1 ? text : text.slice(0, colonIndex).trim();
    const description = colonIndex === -1 ? "" : text.slice(colonIndex + 1).trim();

    bonuses[raceId] = {
      name,
      description,
      bonusDetails: description ? [] : undefined,
    };
  }

  return bonuses;
}

function mergeRacialBonuses(imported, prior = {}) {
  const merged = { ...prior };
  for (const [raceId, entry] of Object.entries(imported)) {
    merged[raceId] = {
      ...entry,
      ...(prior[raceId] ?? {}),
    };
  }
  return merged;
}

function transformStage(spellByEdid, stageConfig, priorStage) {
  const spell = spellByEdid.get(stageConfig.edid);
  const bonus = spell?.description ? cleanSupernaturalText(spell.description) : priorStage?.bonus ?? "";
  const effects = bonus ? parseBonusEffects(bonus) : (priorStage?.effects ?? []);

  return {
    ...(priorStage ?? {
      id: stageConfig.id,
      name: stageConfig.id === "none" ? "None" : stageConfig.id,
      description: "",
      bonus: "",
      effects: [],
      bonusDetails: [],
    }),
    id: stageConfig.id,
    name: priorStage?.name ?? stageConfig.id.replace("stage-", "Stage "),
    description: priorStage?.description ?? "",
    bonus,
    effects: priorStage?.effects?.length && !bonus ? priorStage.effects : effects,
    bonusDetails:
      priorStage?.bonusDetails?.length && !bonus
        ? priorStage.bonusDetails
        : extractConditionalBonusDetails(bonus, effects),
  };
}

export function transformSupernaturalRecords(spellRecords, supernaturalPath) {
  const existing = JSON.parse(readFileSync(supernaturalPath, "utf8"));
  const spellByEdid = new Map(spellRecords.map((record) => [record.edid, record]));

  const priorStages = new Map((existing.vampirism?.stages ?? []).map((stage) => [stage.id, stage]));
  const priorForms = new Map((existing.lycanthropy?.forms ?? []).map((form) => [form.id, form]));

  const stages = [
    priorStages.get("none") ?? {
      id: "none",
      name: "None",
      description: "",
      bonus: "",
      effects: [],
      bonusDetails: [],
    },
    ...VAMPIRISM_STAGE_EDIDS.map((stageConfig) =>
      transformStage(spellByEdid, stageConfig, priorStages.get(stageConfig.id)),
    ),
  ];

  const forms = [
    priorForms.get("none") ?? {
      id: "none",
      name: "None",
      description: "",
      bonus: "",
      effects: [],
      bonusDetails: [],
    },
    ...LYCANTHROPY_FORM_EDIDS.map((formConfig) => {
      const spell = spellByEdid.get(formConfig.edid);
      const prior = priorForms.get(formConfig.id);
      const bonus = spell?.description ? cleanSupernaturalText(spell.description) : prior?.bonus ?? "";
      const effects = bonus ? parseBonusEffects(bonus) : (prior?.effects ?? []);

      return {
        ...(prior ?? {
          id: formConfig.id,
          name: "Werewolf",
          description: "",
          bonus: "",
          effects: [],
          bonusDetails: [],
        }),
        id: formConfig.id,
        bonus,
        effects,
        bonusDetails: extractConditionalBonusDetails(bonus, effects),
      };
    }),
  ];

  return {
    incompatibleTraitIds: existing.incompatibleTraitIds ?? ["silent-dovah"],
    vampirism: {
      stages,
      racialBonuses: mergeRacialBonuses(
        parseRacialBonuses(spellRecords, VAMPIRISM_RACIAL_PREFIX),
        existing.vampirism?.racialBonuses ?? {},
      ),
    },
    lycanthropy: {
      forms,
      racialBonuses: mergeRacialBonuses(
        parseRacialBonuses(spellRecords, WEREWOLF_RACIAL_PREFIX),
        existing.lycanthropy?.racialBonuses ?? {},
      ),
    },
  };
}

export async function importSupernatural(context) {
  const supernatural = transformSupernaturalRecords(
    context.scan.spellRecords,
    context.paths.supernaturalPath,
  );

  return {
    files: [["supernatural.json", supernatural]],
    summary: {
      vampirismStages: supernatural.vampirism.stages.length,
      lycanthropyForms: supernatural.lycanthropy.forms.length,
    },
  };
}
