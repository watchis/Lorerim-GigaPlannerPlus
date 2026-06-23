export type CuratedArrayKind =
  | "deities"
  | "birthsigns"
  | "races"
  | "traits"
  | "skills";

type JsonRecord = Record<string, unknown>;

const CURATED_ARRAYS: Record<string, CuratedArrayKind> = {
  "game/deities.json:deities": "deities",
  "game/birthsigns.json:birthsigns": "birthsigns",
  "game/races.json:races": "races",
  "game/traits.json:traits": "traits",
  "game/skills.json:skills": "skills",
};

export function getCuratedArrayKind(
  filePath: string,
  arrayKey: string,
): CuratedArrayKind | null {
  return CURATED_ARRAYS[`${filePath}:${arrayKey}`] ?? null;
}

export function curatedArrayLabel(kind: CuratedArrayKind): string {
  switch (kind) {
    case "deities":
      return "deity";
    case "birthsigns":
      return "birthsign";
    case "races":
      return "race";
    case "traits":
      return "trait";
    case "skills":
      return "skill";
  }
}

function cloneRecord(value: JsonRecord): JsonRecord {
  return JSON.parse(JSON.stringify(value)) as JsonRecord;
}

const CURATED_ARRAY_EXEMPLAR_IDS: Record<CuratedArrayKind, string> = {
  deities: "auriel",
  birthsigns: "lady",
  races: "bosmer",
  traits: "hoarder",
  skills: "marksman",
};

export function findCuratedExemplar(
  kind: CuratedArrayKind,
  items: unknown[],
): JsonRecord | null {
  const preferred = findItemById(items, CURATED_ARRAY_EXEMPLAR_IDS[kind]);
  if (preferred) return preferred;

  for (const item of items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const record = item as JsonRecord;
    if (record.id !== "none") return record;
  }
  return null;
}

export function curatedExemplarLabel(exemplar: JsonRecord | null): string | null {
  if (!exemplar) return null;
  return typeof exemplar.name === "string" && exemplar.name ? exemplar.name : null;
}

export function curatedExemplarField(
  exemplar: JsonRecord | null,
  key: string,
): string | undefined {
  if (!exemplar) return undefined;
  const value = exemplar[key];
  return typeof value === "string" ? value : undefined;
}

function findItemById(items: unknown[], id: string): JsonRecord | null {
  for (const item of items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const record = item as JsonRecord;
    if (record.id === id) return record;
  }
  return null;
}

function findTemplateItem(items: unknown[], id = "none"): JsonRecord | null {
  const item = findItemById(items, id);
  return item ? cloneRecord(item) : null;
}

function defaultStartingSkills(): Record<string, number> {
  return {
    smithing: 0,
    "heavy-armor": 0,
    block: 0,
    "two-handed": 0,
    "one-handed": 0,
    marksman: 0,
    evasion: 0,
    sneak: 0,
    wayfarer: 0,
    finesse: 0,
    speech: 0,
    alchemy: 0,
    illusion: 0,
    conjuration: 0,
    destruction: 0,
    restoration: 0,
    alteration: 0,
    enchanting: 0,
    destiny: 1,
    traits: 0,
  };
}

function draftText(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

export function buildCuratedArrayEntry(
  kind: CuratedArrayKind,
  draft: {
    id: string;
    name: string;
    description?: string;
    bonus?: string;
    group?: string;
    shrine?: string;
    follower?: string;
    devotee?: string;
    tenets?: string;
    race?: string;
    starting?: string;
    requirement?: string;
    category?: string;
    majorEligible?: boolean;
    minorEligible?: boolean;
  },
  existingItems: unknown[],
): JsonRecord {
  switch (kind) {
    case "deities": {
      const template = findTemplateItem(existingItems) ?? {
        shrine: "-",
        follower: "-",
        devotee: "-",
        tenets: "-",
        race: "All",
        starting: "",
        requirement: "-",
        shrineLocations: [],
        effects: [],
      };
      return {
        ...template,
        id: draft.id,
        name: draft.name,
        shrine: draftText(draft.shrine, String(template.shrine ?? "-")),
        follower: draftText(draft.follower, String(template.follower ?? "-")),
        devotee: draftText(draft.devotee, String(template.devotee ?? "-")),
        tenets: draftText(draft.tenets, String(template.tenets ?? "-")),
        race: draftText(draft.race, String(template.race ?? "All")),
        starting: draftText(draft.starting, String(template.starting ?? "")),
        requirement: draftText(draft.requirement, String(template.requirement ?? "-")),
        shrineLocations: Array.isArray(template.shrineLocations) ? template.shrineLocations : [],
        effects: Array.isArray(template.effects) ? template.effects : [],
      };
    }
    case "birthsigns": {
      const template = findTemplateItem(existingItems) ?? {
        group: "",
        description: "",
        bonus: "",
        effects: [],
        bonusDetails: [],
      };
      return {
        ...template,
        id: draft.id,
        name: draft.name,
        group: draftText(draft.group, String(template.group ?? "")),
        description: draftText(draft.description, String(template.description ?? "")),
        bonus: draftText(draft.bonus, String(template.bonus ?? "")),
        effects: Array.isArray(template.effects) ? template.effects : [],
        bonusDetails: Array.isArray(template.bonusDetails) ? template.bonusDetails : [],
      };
    }
    case "traits": {
      const template = findTemplateItem(existingItems) ?? {
        description: "",
        bonus: "",
        effects: [],
        bonusDetails: [],
      };
      return {
        ...template,
        id: draft.id,
        name: draft.name,
        description: draftText(draft.description, String(template.description ?? "")),
        bonus: draftText(draft.bonus, String(template.bonus ?? "")),
        effects: Array.isArray(template.effects) ? template.effects : [],
        bonusDetails: Array.isArray(template.bonusDetails) ? template.bonusDetails : [],
      };
    }
    case "races": {
      const template = findTemplateItem(existingItems) ?? {
        description: "",
        bonuses: [],
        startingAttributes: { health: 100, magicka: 100, stamina: 100 },
        attributeBonus: { health: 0, magicka: 0, stamina: 0 },
        startingCarryWeight: 200,
        speedBonus: 0,
        unarmedDamage: 8,
        regen: { health: 0.15, magicka: 1, stamina: 1.5 },
        startingSkills: defaultStartingSkills(),
        effects: [],
      };
      return {
        ...template,
        id: draft.id,
        name: draft.name,
        description: draftText(draft.description, String(template.description ?? "")),
        bonuses: Array.isArray(template.bonuses) ? template.bonuses : [],
        effects: Array.isArray(template.effects) ? template.effects : [],
      };
    }
    case "skills":
      return {
        id: draft.id,
        name: draft.name,
        category: draft.category ?? "combat",
        majorEligible: draft.majorEligible ?? true,
        minorEligible: draft.minorEligible ?? true,
      };
  }
}
