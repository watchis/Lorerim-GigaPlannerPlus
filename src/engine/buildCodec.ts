import { gzipSync, gunzipSync } from "fflate";
import type { GameData } from "@/data/schemas";
import { migrateBuildState, type BuildState } from "@/engine/buildEngine";
import { getSkillFloor, reconcileBuild } from "@/engine/buildEngine";
import { migrateLegacySkillTrainingCounts } from "@/lib/skillTraining";
import {
  createBuildCodecRegistry,
  lookupId,
  lookupIndex,
  type BuildCodecRegistry,
} from "@/engine/buildCodecRegistry";

const BUILD_CODEC_V1 = 1;
const BUILD_CODEC_V2 = 2;
const V2_PREFIX = "2.";

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

interface CompactBuildV2 {
  v: typeof BUILD_CODEC_V2;
  mv: string;
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
  d?: string;
}

export interface BuildCodeSizeComparison {
  legacyChars: number;
  compactChars: number;
  savingsPercent: number;
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

function indexList(
  ids: string[],
  map: ReadonlyMap<string, number>,
  label: string,
): number[] {
  return ids.map((id) => lookupIndex(map, id, label)!);
}

function encodeBuildV1(state: BuildState, modpackVersion: string): string {
  const payload: EncodedBuildV1 = {
    v: BUILD_CODEC_V1,
    mv: modpackVersion,
    race: state.raceId,
    stone: state.birthsignId,
    blessing: state.deityId,
    traits: state.traitIds,
    major: state.majorSkillIds,
    minor: state.minorSkillIds,
    attrs: [
      state.attributeBonus.health,
      state.attributeBonus.magicka,
      state.attributeBonus.stamina,
    ],
    perks: state.selectedPerkIds,
    desc: state.description,
  };

  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  return toBase64Url(bytes);
}

function encodeBuildV2(state: BuildState, registry: BuildCodecRegistry): string {
  const { health, magicka, stamina } = state.attributeBonus;
  const raceId = state.raceId ?? "none";

  const payload: CompactBuildV2 = {
    v: BUILD_CODEC_V2,
    mv: registry.modpackVersion,
  };

  if (state.playerLevel > registry.game.mechanics.leveling.baseLevel) {
    payload.lv = state.playerLevel;
  }

  const raceIndex = lookupIndex(registry.raceIndex, raceId, "race");
  if (raceIndex !== undefined && raceId !== "none") {
    payload.r = raceIndex;
  }

  const stoneIndex = lookupIndex(registry.birthsignIndex, state.birthsignId, "birthsign");
  if (stoneIndex !== undefined) {
    payload.s = stoneIndex;
  }

  const deityIndex = lookupIndex(registry.deityIndex, state.deityId, "deity");
  if (deityIndex !== undefined) {
    payload.b = deityIndex;
  }

  if (state.traitIds.length > 0) {
    payload.t = indexList(state.traitIds, registry.traitIndex, "trait");
  }

  if (state.majorSkillIds.length > 0) {
    payload.M = indexList(state.majorSkillIds, registry.skillIndex, "skill");
  }

  if (state.minorSkillIds.length > 0) {
    payload.m = indexList(state.minorSkillIds, registry.skillIndex, "skill");
  }

  if (health > 0 || magicka > 0 || stamina > 0) {
    payload.a = [health, magicka, stamina];
  }

  if (state.selectedPerkIds.length > 0) {
    payload.p = indexList(state.selectedPerkIds, registry.perkIndex, "perk").sort(
      (a, b) => a - b,
    );
  }

  const skillLevelEntries: [number, number][] = [];
  for (const skillId of registry.skills) {
    const floor = getSkillFloor(registry.game, state, skillId);
    const level = state.skillLevels[skillId];
    if (level !== undefined && level !== floor) {
      const skillIndex = lookupIndex(registry.skillIndex, skillId, "skill");
      if (skillIndex !== undefined) {
        skillLevelEntries.push([skillIndex, level]);
      }
    }
  }
  if (skillLevelEntries.length > 0) {
    payload.l = skillLevelEntries;
  }

  const trainingEntries: number[][] = [];
  for (const skillId of registry.skills) {
    const ranges = state.skillTrainingRanges?.[skillId];
    if (!ranges) continue;

    const skillIndex = lookupIndex(registry.skillIndex, skillId, "skill");
    if (skillIndex === undefined) continue;

    ranges.forEach((count, tierIndex) => {
      if (count > 0) {
        trainingEntries.push([skillIndex, tierIndex, count]);
      }
    });
  }
  if (trainingEntries.length > 0) {
    payload.tr = trainingEntries;
  }

  if (state.description.trim()) {
    payload.d = state.description;
  }

  const compressed = gzipSync(new TextEncoder().encode(JSON.stringify(payload)));
  return `${V2_PREFIX}${toBase64Url(compressed)}`;
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

function decodeBuildV2(code: string, registry: BuildCodecRegistry): BuildState {
  const bytes = fromBase64Url(code);
  const json = new TextDecoder().decode(gunzipSync(bytes));
  const payload = JSON.parse(json) as CompactBuildV2;

  if (payload.v !== BUILD_CODEC_V2) {
    throw new Error(`Unsupported build codec version: ${payload.v}`);
  }

  if (payload.mv !== registry.modpackVersion) {
    throw new Error(
      `Build is for modpack ${payload.mv}, but this planner is on ${registry.modpackVersion}`,
    );
  }

  const attrs = payload.a ?? [0, 0, 0];
  const skillLevels = Object.fromEntries(
    (payload.l ?? [])
      .map(([index, level]) => [lookupId(registry.skills, index, "skill")!, level] as const)
      .filter(([skillId]) => skillId !== null),
  );
  const skillTrainingRanges: Record<string, number[]> = {};
  const legacyTrainingCounts: Record<string, number> = {};

  for (const entry of payload.tr ?? []) {
    if (entry.length >= 3) {
      const [skillIndex, tierIndex, count] = entry;
      const skillId = lookupId(registry.skills, skillIndex, "skill");
      if (!skillId || count <= 0) continue;

      const ranges = skillTrainingRanges[skillId] ?? [];
      ranges[tierIndex] = count;
      skillTrainingRanges[skillId] = ranges;
      continue;
    }

    if (entry.length === 2) {
      const [skillIndex, count] = entry;
      const skillId = lookupId(registry.skills, skillIndex, "skill");
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

  return migrateBuildState(payloadToBuildState({
    raceId: lookupId(registry.races, payload.r, "race") ?? "none",
    birthsignId: lookupId(registry.birthsigns, payload.s, "birthsign"),
    deityId: lookupId(registry.deities, payload.b, "deity"),
    traitIds: (payload.t ?? []).map((index) => lookupId(registry.traits, index, "trait")!),
    majorSkillIds: (payload.M ?? []).map((index) => lookupId(registry.skills, index, "skill")!),
    minorSkillIds: (payload.m ?? []).map((index) => lookupId(registry.skills, index, "skill")!),
    attributeBonus: {
      health: attrs[0] ?? 0,
      magicka: attrs[1] ?? 0,
      stamina: attrs[2] ?? 0,
    },
    selectedPerkIds: (payload.p ?? []).map((index) => lookupId(registry.perks, index, "perk")!),
    skillLevels,
    skillTrainingRanges,
    playerLevel: payload.lv ?? registry.game.mechanics.leveling.baseLevel,
    description: payload.d ?? "",
  }, registry.game));
}

function payloadToBuildState(partial: {
  raceId: string;
  birthsignId: string | null;
  deityId: string | null;
  traitIds: string[];
  majorSkillIds: string[];
  minorSkillIds: string[];
  attributeBonus: BuildState["attributeBonus"];
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
    attributeBonus: partial.attributeBonus,
    characterOptionChoices: {},
    selectedPerkIds: partial.selectedPerkIds,
    skillLevels: partial.skillLevels,
    skillTrainingRanges: partial.skillTrainingRanges ?? {},
    playerLevel: partial.playerLevel ?? game?.mechanics.leveling.baseLevel ?? 1,
    description: partial.description,
  };

  return game ? reconcileBuild(game, build) : build;
}

export function encodeBuild(state: BuildState, game: GameData): string {
  const registry = createBuildCodecRegistry(game);
  return encodeBuildV2(state, registry);
}

export function encodeLegacyBuild(state: BuildState, modpackVersion: string): string {
  return encodeBuildV1(state, modpackVersion);
}

export function compareBuildCodeSizes(state: BuildState, game: GameData): BuildCodeSizeComparison {
  const legacyChars = encodeBuildV1(state, game.manifest.version).length;
  const compactChars = encodeBuild(state, game).length;
  const savingsPercent =
    legacyChars === 0 ? 0 : Math.round(((legacyChars - compactChars) / legacyChars) * 100);

  return { legacyChars, compactChars, savingsPercent };
}

export function decodeBuild(code: string, game: GameData): BuildState {
  const trimmed = code.trim();
  if (trimmed.startsWith(V2_PREFIX)) {
    return decodeBuildV2(trimmed.slice(V2_PREFIX.length), createBuildCodecRegistry(game));
  }
  return decodeBuildV1(trimmed);
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
