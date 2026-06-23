/// <reference types="vite/client" />

declare module "*.json" {
  const value: unknown;
  export default value;
}

declare module "@/lib/parseBonusEffects.mjs" {
  import type { Effect } from "@/data/schemas";

  export function parseBonusEffects(bonusText: string): Effect[];
  export function resolveBonusEffects(bonusText: string, priorEffects?: Effect[]): Effect[];
  export function extractConditionalBonusDetails(
    bonusText: string,
    effects?: Effect[],
  ): string[];
  export function mergeEffects(...groups: Effect[][]): Effect[];
  export function trimBonusClauses(clause: string): string[];
}
