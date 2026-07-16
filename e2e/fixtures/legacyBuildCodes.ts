/**
 * Real-world legacy share codes used for cross-version import scenarios.
 * Keep in sync with `src/engine/buildCodec.crossVersion.test.ts`.
 */
export const LEGACY_V2_USER_BUILD_CODE =
  "2.H4sIABLeSWoAAz2RsU6EIRCEX8VQTy4ssMBeae8T_LlCY2NyZ4yeNsZ39-M_YzEZZnZYWPhOX-lYlC5Q8kM-1ENPSmekZ6V3SOljjzylY4Wu6biVKjspPbBs6rIlLggbsq4pywoNzMcV9qWtId-QIzSzpmlOzVBQygWErNKq0qLRvi2mk1NztDfZMEBmUBvUaGWBH3iBF6HC-aU14GCtB5iAGr2K4zu-4zu-4_ei2geYIFRHBQ3ghQE059RwsDxynNW4c7MCXK1kMNQa7M6sZ2bldSznk7auvmgyLhTyRbzKJLkZY-0pY86d-19gaPiJXlf-YVv5zIVvO-1_tYa6rfbtxJ9e-cz7z5fz811JP7_NaJMC4wEAAA";

/** Expectations for {@link LEGACY_V2_USER_BUILD_CODE} after decode. */
export const LEGACY_V2_USER_BUILD = {
  name: "Build 2",
  raceName: "Khajiit",
  playerLevel: 50,
  sourceModpackVersion: "5.0.3.6",
  majorSkills: ["One-Handed", "Evasion", "Alchemy"] as const,
} as const;
