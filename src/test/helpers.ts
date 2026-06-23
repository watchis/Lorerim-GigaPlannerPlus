import { loadAppData } from "@/data/loader";
import type { AppData, GameData } from "@/data/schemas";
import {
  createInitialBuildState,
  type BuildState,
} from "@/engine/buildEngine";

let cachedAppData: AppData | undefined;

export function getTestAppData(): AppData {
  cachedAppData ??= loadAppData();
  return cachedAppData;
}

export function getTestGameData(): GameData {
  return getTestAppData().game;
}

export function createTestBuildState(overrides: Partial<BuildState> = {}): BuildState {
  return { ...createInitialBuildState(), ...overrides };
}
