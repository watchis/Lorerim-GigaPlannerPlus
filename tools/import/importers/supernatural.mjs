import { readFileSync } from "node:fs";
import { cleanDescription, cleanName } from "../lib/transform-utils.mjs";
import { parseBonusEffects, extractConditionalBonusDetails } from "../lib/parse-bonus-effects.mjs";

const VAMPIRISM_FORM_EDIDS = [{ id: "vampire", edid: "REQ_Vampire_Stage4" }];
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

function transformForm(spellByEdid, formConfig, priorForm, fallbackName) {
  const spell = spellByEdid.get(formConfig.edid);
  const bonus = spell?.description ? cleanSupernaturalText(spell.description) : priorForm?.bonus ?? "";
  const effects = bonus ? parseBonusEffects(bonus) : (priorForm?.effects ?? []);

  return {
    ...(priorForm ?? {
      id: formConfig.id,
      name: fallbackName,
      description: "",
      bonus: "",
      effects: [],
      bonusDetails: [],
    }),
    id: formConfig.id,
    description: priorForm?.description ?? "",
    bonus,
    effects: priorForm?.effects?.length && !bonus ? priorForm.effects : effects,
    bonusDetails:
      priorForm?.bonusDetails?.length && !bonus
        ? priorForm.bonusDetails
        : extractConditionalBonusDetails(bonus, effects),
  };
}

export function transformSupernaturalRecords(spellRecords, supernaturalPath) {
  const existing = JSON.parse(readFileSync(supernaturalPath, "utf8"));
  const spellByEdid = new Map(spellRecords.map((record) => [record.edid, record]));

  const priorVampireForms = new Map((existing.vampirism?.forms ?? []).map((form) => [form.id, form]));
  const priorWerewolfForms = new Map((existing.lycanthropy?.forms ?? []).map((form) => [form.id, form]));

  const vampirismForms = [
    priorVampireForms.get("none") ?? {
      id: "none",
      name: "None",
      description: "",
      bonus: "",
      effects: [],
      bonusDetails: [],
    },
    ...VAMPIRISM_FORM_EDIDS.map((formConfig) =>
      transformForm(
        spellByEdid,
        formConfig,
        priorVampireForms.get(formConfig.id),
        "Vampire",
      ),
    ),
  ];

  const lycanthropyForms = [
    priorWerewolfForms.get("none") ?? {
      id: "none",
      name: "None",
      description: "",
      bonus: "",
      effects: [],
      bonusDetails: [],
    },
    ...LYCANTHROPY_FORM_EDIDS.map((formConfig) =>
      transformForm(
        spellByEdid,
        formConfig,
        priorWerewolfForms.get(formConfig.id),
        "Werewolf",
      ),
    ),
  ];

  return {
    incompatibleTraitIds: existing.incompatibleTraitIds ?? ["silent-dovah"],
    vampirism: {
      forms: vampirismForms,
      racialBonuses: mergeRacialBonuses(
        parseRacialBonuses(spellRecords, VAMPIRISM_RACIAL_PREFIX),
        existing.vampirism?.racialBonuses ?? {},
      ),
    },
    lycanthropy: {
      forms: lycanthropyForms,
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
      vampirismForms: supernatural.vampirism.forms.length,
      lycanthropyForms: supernatural.lycanthropy.forms.length,
    },
  };
}
