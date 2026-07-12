import { gzipSync, gunzipSync } from "fflate";
import type { GameData } from "@/data/schemas";
import {
  getEffectiveSkillFloor,
  migrateBuildState,
  reconcileImportedBuild,
  type BuildState,
} from "@/engine/buildEngine";
import { migrateLegacySkillTrainingCounts } from "@/lib/skillTraining";
import {
  decodeCharacterOptionChoices,
  type CharacterOptionCoEntry,
} from "@/engine/legacyCharacterOptionCodec";
import {
  createBuildCodecRegistryForVersion,
  lookupIdSafe,
  type BuildCodecRegistry,
} from "@/engine/buildCodecRegistry";
import {
  DEFAULT_VARIANT_NAME,
  getActiveVariantIndex,
  getDefaultVariantName,
  normalizeSavedBuild,
  type SavedBuild,
} from "@/store/savedBuilds";

const BUILD_CODEC_V1 = 1;
const BUILD_CODEC_V2 = 2;
const BUILD_CODEC_V3 = 3;
const V2_PREFIX = "2.";
const V3_PREFIX = "3.";

interface EncodedBuildV1 {
  v: number;
  mv: string;
  race: string | null;
  stone: string | null;
  blessing: string | null;
  traits: string[];
  major: string[];
  minor: string[];
  attrs: [number, number, number];
  perks: string[];
  desc: string;
}

type CompactBuildPayload = {
  lv?: number;
  r?: number;
  s?: number;
  b?: number;
  t?: number[];
  M?: number[];
  m?: number[];
  a?: [number, number, number];
  p?: number[];
  l?: [number, number][];
  tr?: number[][];
  co?: CharacterOptionCoEntry[];
  oi?: number[];
  d?: string;
};

type CompactMilestone = [string, CompactBuildPayload, string?];

interface CompactBuildV2 extends CompactBuildPayload {
  v: typeof BUILD_CODEC_V2;
  mv: string;
  bn?: string;
  dv?: string;
  dn?: string;
  ms?: CompactMilestone[];
  av?: number;
}

type CompactBuildPayloadV3 = {
  lv?: number;
  r?: string;
  s?: string;
  b?: string;
  t?: string[];
  M?: string[];
  m?: string[];
  a?: [number, number, number];
  p?: string[];
  l?: [string, number][];
  tr?: [string, number, number][];
  co?: [string, string][];
  oi?: string[];
  d?: string;
};

type CompactMilestoneV3 = [string, CompactBuildPayloadV3, string?];

interface CompactBuildV3 extends CompactBuildPayloadV3 {
  v: typeof BUILD_CODEC_V3;
  mv: string;
  bn?: string;
  dv?: string;
  dn?: string;
  ms?: CompactMilestoneV3[];
  av?: number;
}

export interface SharedBuildPackage {
  name: string;
  defaultVariantName: string;
  defaultVariantNotes?: string;
  milestones: Array<{ name: string; build: BuildState; notes?: string }>;
  activeVariantIndex: number;
}

export interface DecodedBuildPackage {
  build: BuildState;
  shared?: SharedBuildPackage;
  /** Modpack version embedded in the share code (may differ from the current planner). */
  sourceModpackVersion?: string;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(code: string): Uint8Array {
  const normalized = code.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function compactPayloadFromBuildIds(
  state: BuildState,
  game: GameData,
): CompactBuildPayloadV3 {
  const { health, magicka, stamina } = state.attributeBonus;
  const raceId = state.raceId ?? "none";
  const payload: CompactBuildPayloadV3 = {};

  if (state.playerLevel > game.mechanics.leveling.baseLevel) {
    payload.lv = state.playerLevel;
  }

  if (raceId !== "none") {
    payload.r = raceId;
  }

  if (state.birthsignId) {
    payload.s = state.birthsignId;
  }

  if (state.deityId) {
    payload.b = state.deityId;
  }

  if (state.traitIds.length > 0) {
    payload.t = [...state.traitIds];
  }

  if (state.majorSkillIds.length > 0) {
    payload.M = [...state.majorSkillIds];
  }

  if (state.minorSkillIds.length > 0) {
    payload.m = [...state.minorSkillIds];
  }

  if (health > 0 || magicka > 0 || stamina > 0) {
    payload.a = [health, magicka, stamina];
  }

  if (state.selectedPerkIds.length > 0) {
    payload.p = [...state.selectedPerkIds].sort();
  }

  const skillLevelEntries: [string, number][] = [];
  for (const skillId of game.skills.map((skill) => skill.id)) {
    const floor = getEffectiveSkillFloor(game, state, skillId);
    const level = state.skillLevels[skillId];
    if (level !== undefined && level !== floor) {
      skillLevelEntries.push([skillId, level]);
    }
  }
  if (skillLevelEntries.length > 0) {
    payload.l = skillLevelEntries;
  }

  const trainingEntries: [string, number, number][] = [];
  for (const skillId of game.skills.map((skill) => skill.id)) {
    const ranges = state.skillTrainingRanges?.[skillId];
    if (!ranges) continue;

    ranges.forEach((count, tierIndex) => {
      if (count > 0) {
        trainingEntries.push([skillId, tierIndex, count]);
      }
    });
  }
  if (trainingEntries.length > 0) {
    payload.tr = trainingEntries;
  }

  const characterOptionEntries: [string, string][] = [];
  for (const option of game.characterOptions) {
    const selectedId = state.characterOptionChoices[option.id] ?? option.defaultChoice;
    if (selectedId === option.defaultChoice) continue;
    const validChoice = option.choices.some((choice) => choice.id === selectedId);
    if (!validChoice) {
      throw new Error(`Unknown character option choice: ${option.id}/${selectedId}`);
    }
    characterOptionEntries.push([option.id, selectedId]);
  }
  if (characterOptionEntries.length > 0) {
    payload.co = characterOptionEntries;
  }

  if (state.oghmaSkillIds.length > 0) {
    payload.oi = [...state.oghmaSkillIds];
  }

  if (state.description.trim()) {
    payload.d = state.description;
  }

  return payload;
}

function mapIndexedIds(list: readonly string[], indices: number[] | undefined): string[] {
  return (indices ?? [])
    .map((index) => lookupIdSafe(list, index))
    .filter((id): id is string => id !== null);
}

function buildStateFromCompactPayload(
  payload: CompactBuildPayload,
  registry: BuildCodecRegistry,
): BuildState {
  const attrs = payload.a ?? [0, 0, 0];
  const skillLevels = Object.fromEntries(
    (payload.l ?? [])
      .map(([index, level]) => [lookupIdSafe(registry.skills, index), level] as const)
      .filter(([skillId]) => skillId !== null)
      .map(([skillId, level]) => [skillId!, level] as const),
  );
  const skillTrainingRanges: Record<string, number[]> = {};
  const legacyTrainingCounts: Record<string, number> = {};

  for (const entry of payload.tr ?? []) {
    if (entry.length >= 3) {
      const [skillIndex, tierIndex, count] = entry;
      const skillId = lookupIdSafe(registry.skills, skillIndex);
      if (!skillId || count <= 0) continue;

      const ranges = skillTrainingRanges[skillId] ?? [];
      ranges[tierIndex] = count;
      skillTrainingRanges[skillId] = ranges;
      continue;
    }

    if (entry.length === 2) {
      const [skillIndex, count] = entry;
      const skillId = lookupIdSafe(registry.skills, skillIndex);
      if (skillId && count > 0) {
        legacyTrainingCounts[skillId] = count;
      }
    }
  }

  if (Object.keys(legacyTrainingCounts).length > 0) {
    Object.assign(
      skillTrainingRanges,
      migrateLegacySkillTrainingCounts(registry.game, legacyTrainingCounts),
    );
  }

  const characterOptionChoices = decodeCharacterOptionChoices(
    payload.co,
    registry.modpackVersion,
  );

  return payloadToBuildState({
    raceId: lookupIdSafe(registry.races, payload.r) ?? "none",
    birthsignId: lookupIdSafe(registry.birthsigns, payload.s),
    deityId: lookupIdSafe(registry.deities, payload.b),
    traitIds: mapIndexedIds(registry.traits, payload.t),
    majorSkillIds: mapIndexedIds(registry.skills, payload.M),
    minorSkillIds: mapIndexedIds(registry.skills, payload.m),
    oghmaSkillIds: mapIndexedIds(registry.skills, payload.oi),
    attributeBonus: {
      health: attrs[0] ?? 0,
      magicka: attrs[1] ?? 0,
      stamina: attrs[2] ?? 0,
    },
    selectedPerkIds: mapIndexedIds(registry.perks, payload.p),
    skillLevels,
    skillTrainingRanges,
    characterOptionChoices,
    playerLevel: payload.lv ?? registry.game.mechanics.leveling.baseLevel,
    description: payload.d ?? "",
  }, registry.game);
}

function buildStateFromIdPayload(
  payload: CompactBuildPayloadV3,
  game: GameData,
  modpackVersion: string = game.manifest.version,
): BuildState {
  const attrs = payload.a ?? [0, 0, 0];
  const skillLevels = Object.fromEntries(payload.l ?? []);
  const skillTrainingRanges: Record<string, number[]> = {};

  for (const entry of payload.tr ?? []) {
    const [skillId, tierIndex, count] = entry;
    if (!skillId || count <= 0) continue;

    const ranges = skillTrainingRanges[skillId] ?? [];
    ranges[tierIndex] = count;
    skillTrainingRanges[skillId] = ranges;
  }

  const characterOptionChoices = decodeCharacterOptionChoices(payload.co, modpackVersion);

  return payloadToBuildState({
    raceId: payload.r ?? "none",
    birthsignId: payload.s ?? null,
    deityId: payload.b ?? null,
    traitIds: payload.t ?? [],
    majorSkillIds: payload.M ?? [],
    minorSkillIds: payload.m ?? [],
    oghmaSkillIds: payload.oi ?? [],
    attributeBonus: {
      health: attrs[0] ?? 0,
      magicka: attrs[1] ?? 0,
      stamina: attrs[2] ?? 0,
    },
    selectedPerkIds: payload.p ?? [],
    skillLevels,
    skillTrainingRanges,
    characterOptionChoices,
    playerLevel: payload.lv ?? game.mechanics.leveling.baseLevel,
    description: payload.d ?? "",
  }, game);
}

function encodeCompactBuildV3(payload: CompactBuildV3): string {
  const compressed = gzipSync(new TextEncoder().encode(JSON.stringify(payload)));
  return `${V3_PREFIX}${toBase64Url(compressed)}`;
}

function encodeBuildV3(state: BuildState, game: GameData): string {
  return encodeCompactBuildV3({
    v: BUILD_CODEC_V3,
    mv: game.manifest.version,
    ...compactPayloadFromBuildIds(state, game),
  });
}

function encodeSavedBuildV3(entry: SavedBuild, game: GameData): string {
  const normalized = normalizeSavedBuild(entry);
  const payload: CompactBuildV3 = {
    v: BUILD_CODEC_V3,
    mv: game.manifest.version,
    ...compactPayloadFromBuildIds(normalized.build, game),
  };

  if (normalized.name.trim()) {
    payload.bn = normalized.name;
  }

  const defaultVariantName = getDefaultVariantName(normalized);
  if (defaultVariantName !== DEFAULT_VARIANT_NAME) {
    payload.dv = defaultVariantName;
  }

  if (normalized.defaultVariantNotes?.trim()) {
    payload.dn = normalized.defaultVariantNotes;
  }

  if (normalized.milestones.length > 0) {
    payload.ms = normalized.milestones.map((milestone) => {
      const compact = compactPayloadFromBuildIds(milestone.build, game);
      if (milestone.notes?.trim()) {
        return [milestone.name, compact, milestone.notes];
      }
      return [milestone.name, compact];
    });
  }

  const activeVariantIndex = getActiveVariantIndex(normalized);
  if (activeVariantIndex !== 0) {
    payload.av = activeVariantIndex;
  }

  return encodeCompactBuildV3(payload);
}

function decodeBuildV1(code: string): BuildState {
  const bytes = fromBase64Url(code);
  const json = new TextDecoder().decode(bytes);
  const payload = JSON.parse(json) as EncodedBuildV1;

  if (payload.v !== BUILD_CODEC_V1) {
    throw new Error(`Unsupported build codec version: ${payload.v}`);
  }

  return migrateBuildState(payloadToBuildState({
    raceId: payload.race === null ? "none" : (payload.race ?? "none"),
    birthsignId: payload.stone,
    deityId: payload.blessing,
    traitIds: payload.traits ?? [],
    majorSkillIds: payload.major ?? [],
    minorSkillIds: payload.minor ?? [],
    attributeBonus: {
      health: payload.attrs?.[0] ?? 0,
      magicka: payload.attrs?.[1] ?? 0,
      stamina: payload.attrs?.[2] ?? 0,
    },
    selectedPerkIds: payload.perks ?? [],
    skillLevels: {},
    skillTrainingRanges: {},
    playerLevel: 1,
    description: payload.desc ?? "",
  }));
}

function sharedPackageFromPayload(
  payload: CompactBuildV2,
  registry: BuildCodecRegistry,
): SharedBuildPackage | undefined {
  const hasMetadata =
    payload.bn !== undefined ||
    payload.dv !== undefined ||
    payload.dn !== undefined ||
    (payload.ms?.length ?? 0) > 0 ||
    payload.av !== undefined;

  if (!hasMetadata) return undefined;

  return {
    name: payload.bn ?? "",
    defaultVariantName: payload.dv ?? DEFAULT_VARIANT_NAME,
    defaultVariantNotes: payload.dn ?? "",
    milestones: (payload.ms ?? []).map((milestone) => {
      const [name, compact, notes] = milestone;
      return {
        name,
        build: buildStateFromCompactPayload(compact, registry),
        notes: notes ?? "",
      };
    }),
    activeVariantIndex: payload.av ?? 0,
  };
}

function sharedPackageFromPayloadV3(
  payload: CompactBuildV3,
  game: GameData,
  modpackVersion: string,
): SharedBuildPackage | undefined {
  const hasMetadata =
    payload.bn !== undefined ||
    payload.dv !== undefined ||
    payload.dn !== undefined ||
    (payload.ms?.length ?? 0) > 0 ||
    payload.av !== undefined;

  if (!hasMetadata) return undefined;

  return {
    name: payload.bn ?? "",
    defaultVariantName: payload.dv ?? DEFAULT_VARIANT_NAME,
    defaultVariantNotes: payload.dn ?? "",
    milestones: (payload.ms ?? []).map((milestone) => {
      const [name, compact, notes] = milestone;
      return {
        name,
        build: buildStateFromIdPayload(compact, game, modpackVersion),
        notes: notes ?? "",
      };
    }),
    activeVariantIndex: payload.av ?? 0,
  };
}

function decodeBuildV3(code: string, game: GameData): DecodedBuildPackage {
  const bytes = fromBase64Url(code);
  const json = new TextDecoder().decode(gunzipSync(bytes));
  const payload = JSON.parse(json) as CompactBuildV3;

  if (payload.v !== BUILD_CODEC_V3) {
    throw new Error(`Unsupported build codec version: ${payload.v}`);
  }

  const sourceModpackVersion = payload.mv.trim();
  const modpackVersion = sourceModpackVersion || game.manifest.version;

  return {
    build: buildStateFromIdPayload(payload, game, modpackVersion),
    shared: sharedPackageFromPayloadV3(payload, game, modpackVersion),
    sourceModpackVersion: sourceModpackVersion || undefined,
  };
}

function decodeBuildV2(code: string, game: GameData): DecodedBuildPackage {
  const bytes = fromBase64Url(code);
  const json = new TextDecoder().decode(gunzipSync(bytes));
  const payload = JSON.parse(json) as CompactBuildV2;

  if (payload.v !== BUILD_CODEC_V2) {
    throw new Error(`Unsupported build codec version: ${payload.v}`);
  }

  const sourceModpackVersion = payload.mv.trim();
  const registry = createBuildCodecRegistryForVersion(game, sourceModpackVersion);

  const shared = sharedPackageFromPayload(payload, registry);
  const build = buildStateFromCompactPayload(payload, registry);

  return {
    build,
    shared,
    sourceModpackVersion: sourceModpackVersion || undefined,
  };
}

function payloadToBuildState(partial: {
  raceId: string;
  birthsignId: string | null;
  deityId: string | null;
  traitIds: string[];
  majorSkillIds: string[];
  minorSkillIds: string[];
  oghmaSkillIds?: string[];
  attributeBonus: BuildState["attributeBonus"];
  characterOptionChoices?: BuildState["characterOptionChoices"];
  selectedPerkIds: string[];
  skillLevels: BuildState["skillLevels"];
  skillTrainingRanges?: BuildState["skillTrainingRanges"];
  playerLevel?: number;
  description: string;
}, game?: GameData): BuildState {
  const build: BuildState = {
    raceId: partial.raceId,
    birthsignId: partial.birthsignId,
    deityId: partial.deityId,
    traitIds: partial.traitIds,
    majorSkillIds: partial.majorSkillIds,
    minorSkillIds: partial.minorSkillIds,
    oghmaSkillIds: partial.oghmaSkillIds ?? [],
    attributeBonus: partial.attributeBonus,
    characterOptionChoices: partial.characterOptionChoices ?? {},
    selectedPerkIds: partial.selectedPerkIds,
    skillLevels: partial.skillLevels,
    skillTrainingRanges: partial.skillTrainingRanges ?? {},
    playerLevel: partial.playerLevel ?? game?.mechanics.leveling.baseLevel ?? 1,
    description: partial.description,
  };

  return game ? reconcileImportedBuild(game, build) : build;
}

export function encodeBuild(state: BuildState, game: GameData): string {
  return encodeBuildV3(state, game);
}

export function encodeSavedBuild(entry: SavedBuild, game: GameData): string {
  return encodeSavedBuildV3(entry, game);
}

export function decodeBuildPackage(code: string, game: GameData): DecodedBuildPackage {
  const trimmed = code.trim();
  if (trimmed.startsWith(V3_PREFIX)) {
    return decodeBuildV3(trimmed.slice(V3_PREFIX.length), game);
  }
  if (trimmed.startsWith(V2_PREFIX)) {
    return decodeBuildV2(trimmed.slice(V2_PREFIX.length), game);
  }
  return { build: reconcileImportedBuild(game, decodeBuildV1(trimmed)) };
}

export function decodeBuild(code: string, game: GameData): BuildState {
  return decodeBuildPackage(code, game).build;
}

export function getBuildFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("build");
}

export function setBuildInUrl(code: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set("build", code);
  window.history.replaceState({}, "", url.toString());
}

export function clearBuildFromUrl(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete("build");
  window.history.replaceState({}, "", url.toString());
}

