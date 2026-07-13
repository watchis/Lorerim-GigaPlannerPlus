import { readFileSync } from "node:fs";
import { cleanDescription, cleanName } from "../lib/transform-utils.mjs";
import { parseBonusEffects, extractConditionalBonusDetails } from "../lib/parse-bonus-effects.mjs";
import {
  buildClassicalPhylacteryFromMessages,
  defaultLichdomShell,
  detectLichFramework,
  mergePhylactery,
} from "../lib/lich-framework.mjs";

const VAMPIRISM_STAGE_EDID_RE = /^REQ_Vampire_Stage(\d+)$/i;
const LYCANTHROPY_FORM_EDIDS = [{ id: "werewolf", edid: "REQ_Werewolf_HumanForm" }];

const VAMPIRISM_RACIAL_PREFIX = "REQ_Vampire_Race_";
const WEREWOLF_RACIAL_PREFIX = "REQ_Werewolf_Race_";
const LICH_CURSE_SPELL_EDIDS = ["NecroUCLCurseOfLichdom", "NecroUCLCurseofLichdom"];

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
    if (!record.edid?.startsWith(prefix)) continue;
    const segment = record.edid.slice(prefix.length);
    const raceId = RACE_EDID_TO_ID[segment] ?? segment.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
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

/** Keep hand-tuned racial names; refresh description from plugin when present. */
function mergeRacialBonuses(imported, prior = {}) {
  const raceIds = new Set([...Object.keys(prior), ...Object.keys(imported)]);
  const merged = {};

  for (const raceId of raceIds) {
    const next = imported[raceId];
    const previous = prior[raceId];
    if (!next && previous) {
      merged[raceId] = previous;
      continue;
    }
    if (!previous) {
      merged[raceId] = next;
      continue;
    }
    merged[raceId] = {
      name: previous.name || next.name,
      description: next.description || previous.description || "",
      ...(previous.bonusDetails?.length
        ? { bonusDetails: previous.bonusDetails }
        : next.bonusDetails
          ? { bonusDetails: next.bonusDetails }
          : {}),
    };
  }

  return merged;
}

function preserveHandTunedDetails(prior, bonus, effects) {
  if (prior?.bonusDetails?.length) return [...prior.bonusDetails];
  return extractConditionalBonusDetails(bonus, effects);
}

function transformStage(spellByEdid, stageConfig, priorStage) {
  const spell = spellByEdid.get(stageConfig.edid);
  const bonus = spell?.description ? cleanSupernaturalText(spell.description) : priorStage?.bonus ?? "";
  const parsedEffects = bonus ? parseBonusEffects(bonus) : [];
  const effects = priorStage?.effects?.length
    ? priorStage.effects
    : parsedEffects;

  return {
    ...(priorStage ?? {
      id: stageConfig.id,
      name: `Stage ${stageConfig.stageNumber}`,
      description: "",
      bonus: "",
      effects: [],
      bonusDetails: [],
    }),
    id: stageConfig.id,
    name: priorStage?.name || spell?.name || `Stage ${stageConfig.stageNumber}`,
    description: priorStage?.description ?? "",
    bonus,
    effects,
    bonusDetails: preserveHandTunedDetails(priorStage, bonus, effects),
  };
}

function transformForm(spellByEdid, formConfig, priorForm, fallbackName) {
  const spell = spellByEdid.get(formConfig.edid);
  const bonus = spell?.description ? cleanSupernaturalText(spell.description) : priorForm?.bonus ?? "";
  const parsedEffects = bonus ? parseBonusEffects(bonus) : [];
  const effects = priorForm?.effects?.length
    ? priorForm.effects
    : parsedEffects;

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
    name: priorForm?.name || spell?.name || fallbackName,
    description: priorForm?.description ?? "",
    bonus,
    effects,
    bonusDetails: preserveHandTunedDetails(priorForm, bonus, effects),
  };
}

function discoverVampirismStages(spellByEdid, priorStages) {
  const byNumber = new Map();
  for (const [edid] of spellByEdid) {
    const match = VAMPIRISM_STAGE_EDID_RE.exec(edid);
    if (!match) continue;
    const stageNumber = Number.parseInt(match[1], 10);
    byNumber.set(stageNumber, {
      id: `stage-${stageNumber}`,
      edid,
      stageNumber,
    });
  }

  const priorNumbers = [...priorStages.keys()]
    .map((id) => /^stage-(\d+)$/i.exec(id))
    .filter(Boolean)
    .map((match) => Number.parseInt(match[1], 10));

  const stageNumbers = [
    ...new Set([1, 2, 3, 4, ...byNumber.keys(), ...priorNumbers]),
  ].sort((a, b) => a - b);

  return stageNumbers.map((stageNumber) => {
    const stageConfig = byNumber.get(stageNumber) ?? {
      id: `stage-${stageNumber}`,
      edid: `REQ_Vampire_Stage${stageNumber}`,
      stageNumber,
    };
    return transformStage(spellByEdid, stageConfig, priorStages.get(stageConfig.id));
  });
}

function discoverLycanthropyForms(spellByEdid, priorForms) {
  return LYCANTHROPY_FORM_EDIDS.map((formConfig) =>
    transformForm(
      spellByEdid,
      formConfig,
      priorForms.get(formConfig.id),
      formConfig.id === "werewolf" ? "Werewolf" : formConfig.id,
    ),
  );
}

function noneForm(prior) {
  return (
    prior ?? {
      id: "none",
      name: "None",
      description: "",
      bonus: "",
      effects: [],
      bonusDetails: [],
    }
  );
}

function transformLichdom({ existing, spellByEdid, mesgRecords, plugins, avifMembership }) {
  const prior = existing.lichdom ?? defaultLichdomShell();
  const framework = detectLichFramework({ plugins, mesgRecords, avifMembership });
  const priorForms = new Map((prior.forms ?? []).map((form) => [form.id, form]));

  const lichFormPrior = priorForms.get("lich");
  let lichForm = lichFormPrior
    ? { ...lichFormPrior }
    : {
        id: "lich",
        name: "Lich",
        description: "",
        bonus: "",
        effects: [],
        bonusDetails: [],
      };

  for (const edid of LICH_CURSE_SPELL_EDIDS) {
    const spell = spellByEdid.get(edid);
    if (!spell?.description) continue;
    const bonus = cleanSupernaturalText(spell.description);
    lichForm = {
      ...lichForm,
      bonus,
      effects: lichForm.effects?.length ? lichForm.effects : [],
      bonusDetails: preserveHandTunedDetails(lichForm, bonus, lichForm.effects ?? []),
    };
    break;
  }

  let phylactery = prior.phylactery ?? defaultLichdomShell().phylactery;

  if (framework.mode === "phylactery") {
    phylactery = mergePhylactery(prior.phylactery, buildClassicalPhylacteryFromMessages(mesgRecords));
  } else if (framework.mode === "perk-tree") {
    // Magicka Weave replaces Classical phylactery progression.
    phylactery = {
      maxSouls: prior.phylactery?.maxSouls ?? 50,
      perSoul: prior.phylactery?.perSoul ?? defaultLichdomShell().phylactery.perSoul,
      thresholds: [],
    };
  }

  return {
    lichdom: {
      forms: [noneForm(priorForms.get("none")), lichForm],
      racialBonuses: prior.racialBonuses ?? {},
      phylactery,
    },
    lichFramework: framework,
  };
}

export function transformSupernaturalRecords(
  spellRecords,
  supernaturalPath,
  { mesgRecords = [], plugins = [], avifMembership = null } = {},
) {
  const existing = JSON.parse(readFileSync(supernaturalPath, "utf8"));
  const spellByEdid = new Map(spellRecords.map((record) => [record.edid, record]));

  const priorStages = new Map((existing.vampirism?.stages ?? []).map((stage) => [stage.id, stage]));
  const priorWerewolfForms = new Map((existing.lycanthropy?.forms ?? []).map((form) => [form.id, form]));

  const vampirismStages = [noneForm(priorStages.get("none")), ...discoverVampirismStages(spellByEdid, priorStages)];
  const lycanthropyForms = [
    noneForm(priorWerewolfForms.get("none")),
    ...discoverLycanthropyForms(spellByEdid, priorWerewolfForms),
  ];

  const { lichdom, lichFramework } = transformLichdom({
    existing,
    spellByEdid,
    mesgRecords,
    plugins,
    avifMembership,
  });

  return {
    incompatibleTraitIds: existing.incompatibleTraitIds ?? ["silent-dovah"],
    vampirism: {
      stages: vampirismStages,
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
    lichdom,
    _meta: { lichFramework },
  };
}

export async function importSupernatural(context) {
  const transformed = transformSupernaturalRecords(
    context.scan.spellRecords,
    context.paths.supernaturalPath,
    {
      mesgRecords: context.scan.mesgRecords ?? [],
      plugins: context.plugins ?? context.install?.plugins ?? [],
      avifMembership: context.derived?.avifMembership ?? null,
    },
  );

  const { _meta, ...supernatural } = transformed;

  return {
    files: [["supernatural.json", supernatural]],
    summary: {
      vampirismStages: supernatural.vampirism.stages.length,
      lycanthropyForms: supernatural.lycanthropy.forms.length,
      lichdomForms: supernatural.lichdom?.forms?.length ?? 0,
      phylacteryThresholds: supernatural.lichdom?.phylactery?.thresholds?.length ?? 0,
      lichMode: _meta?.lichFramework?.mode ?? "preserve",
    },
  };
}
