import type { Effect, GameData, Mechanics, Race, StatDefinition } from "@/data/schemas";
import type { Attributes, BuildState } from "@/engine/buildEngine";
import { collectBuildChanges } from "@/lib/buildModifications";

export interface BonusSource {
  name: string;
  labelKey?: string;
  value: number;
  valueKind: StatDefinition["valueKind"];
  isPercent?: boolean;
}

export interface TrackedStatEntry {
  id: string;
  label: string;
  category: string;
  value: number;
  valueKind: StatDefinition["valueKind"];
  isPercent: boolean;
  sources: BonusSource[];
}

export interface SourcedEffect {
  source: string;
  labelKey?: string;
  effect: Effect;
}

interface AggregatedEffects {
  attributes: Attributes;
  derivedStats: Record<string, number>;
  skillPointsPerLevel: number;
  perkPoints: number;
  traitSlots: number;
  flags: Set<string>;
}

function emptyAttributes(): Attributes {
  return { health: 0, magicka: 0, stamina: 0 };
}

function getAttributePointsPerChoice(
  game: GameData,
  stat: keyof Attributes,
): number {
  const index = stat === "health" ? 0 : stat === "magicka" ? 1 : 2;
  return game.mechanics.leveling.attributePointsPerLevel[index];
}

export function aggregateEffects(effects: Effect[]): AggregatedEffects {
  const attributes = emptyAttributes();
  const derivedStats: Record<string, number> = {};
  const flags = new Set<string>();
  let skillPointsPerLevel = 0;
  let perkPoints = 0;
  let traitSlots = 0;

  for (const effect of effects) {
    if (effect.type === "skillPointsPerLevel") {
      skillPointsPerLevel += effect.value;
      continue;
    }
    if (effect.type === "perkPoints") {
      perkPoints += effect.value;
      continue;
    }
    if (effect.type === "traitSlot") {
      traitSlots += effect.value;
      continue;
    }
    if (effect.type === "flag") {
      flags.add(effect.stat);
      continue;
    }
    if (effect.type === "attribute") {
      attributes[effect.stat] += effect.value;
      continue;
    }
    derivedStats[effect.stat] = (derivedStats[effect.stat] ?? 0) + effect.value;
  }

  return { attributes, derivedStats, skillPointsPerLevel, perkPoints, traitSlots, flags };
}

function resolveRace(game: GameData, raceId: string | null): Race | undefined {
  if (!raceId || raceId === "none") return undefined;
  return game.races.find((race) => race.id === raceId);
}

function getStatDefinition(catalog: GameData["stats"], statId: string): StatDefinition | undefined {
  return catalog.stats.find((stat) => stat.id === statId);
}

function addNumericEntry(
  totals: Map<string, number>,
  statId: string,
  amount: number,
): void {
  if (amount === 0) return;
  totals.set(statId, (totals.get(statId) ?? 0) + amount);
}

function addBonusSource(
  sources: Map<string, BonusSource[]>,
  statId: string,
  source: BonusSource,
): void {
  if (source.valueKind !== "flag" && source.value === 0) return;

  const list = sources.get(statId) ?? [];
  const existing = list.find(
    (entry) => entry.name === source.name && entry.labelKey === source.labelKey,
  );
  if (existing) {
    if (source.valueKind === "flag") return;
    existing.value += source.value;
  } else {
    list.push({ ...source });
  }
  sources.set(statId, list);
}

function applyRangedDamageBonus(
  totals: Map<string, number>,
  sources: Map<string, BonusSource[]>,
  rangedDamage: number,
  source: Pick<BonusSource, "name" | "labelKey">,
): void {
  if (rangedDamage === 0) return;
  addNumericEntry(totals, "bowDamage", rangedDamage);
  addNumericEntry(totals, "crossbowDamage", rangedDamage);
  for (const statId of ["bowDamage", "crossbowDamage"] as const) {
    addBonusSource(sources, statId, {
      name: source.name,
      labelKey: source.labelKey,
      value: rangedDamage,
      valueKind: "percent",
      isPercent: true,
    });
  }
}

function applyMeleeDamageBonus(
  totals: Map<string, number>,
  sources: Map<string, BonusSource[]>,
  meleeDamage: number,
  source: Pick<BonusSource, "name" | "labelKey">,
): void {
  if (meleeDamage === 0) return;
  addNumericEntry(totals, "oneHandDamage", meleeDamage);
  addNumericEntry(totals, "twoHandDamage", meleeDamage);
  for (const statId of ["oneHandDamage", "twoHandDamage"] as const) {
    addBonusSource(sources, statId, {
      name: source.name,
      labelKey: source.labelKey,
      value: meleeDamage,
      valueKind: "percent",
      isPercent: true,
    });
  }
}

function applySourcedEffect(
  game: GameData,
  totals: Map<string, number>,
  sources: Map<string, BonusSource[]>,
  effect: Effect,
  source: Pick<BonusSource, "name" | "labelKey">,
): void {
  if (effect.type === "skillPointsPerLevel") {
    addNumericEntry(totals, "skillPointsPerLevel", effect.value);
    addBonusSource(sources, "skillPointsPerLevel", {
      name: source.name,
      labelKey: source.labelKey,
      value: effect.value,
      valueKind: "flat",
    });
    return;
  }

  if (effect.type === "perkPoints") {
    addNumericEntry(totals, "perkPoints", effect.value);
    addBonusSource(sources, "perkPoints", {
      name: source.name,
      labelKey: source.labelKey,
      value: effect.value,
      valueKind: "flat",
    });
    return;
  }

  if (effect.type === "traitSlot") {
    addNumericEntry(totals, "traitSlots", effect.value);
    addBonusSource(sources, "traitSlots", {
      name: source.name,
      labelKey: source.labelKey,
      value: effect.value,
      valueKind: "flat",
    });
    return;
  }

  if (effect.type === "flag") {
    addBonusSource(sources, effect.stat, {
      name: source.name,
      labelKey: source.labelKey,
      value: 1,
      valueKind: "flag",
    });
    return;
  }

  if (effect.type === "attribute") {
    addNumericEntry(totals, effect.stat, effect.value);
    addBonusSource(sources, effect.stat, {
      name: source.name,
      labelKey: source.labelKey,
      value: effect.value,
      valueKind: "flat",
    });
    return;
  }

  if (effect.stat === "meleeDamage") {
    applyMeleeDamageBonus(totals, sources, effect.value, source);
    return;
  }

  if (effect.stat === "rangedDamage") {
    applyRangedDamageBonus(totals, sources, effect.value, source);
    return;
  }

  const def = getStatDefinition(game.stats, effect.stat);
  const isPercent = effect.isPercent ?? def?.valueKind === "percent";
  addNumericEntry(totals, effect.stat, effect.value);
  addBonusSource(sources, effect.stat, {
    name: source.name,
    labelKey: source.labelKey,
    value: effect.value,
    valueKind: def?.valueKind ?? "flat",
    isPercent,
  });
}

function computeAttributeDerivedValue(
  derivedStat: Mechanics["derivedStats"][number],
  attributes: Attributes,
): number {
  const weighted =
    attributes.health * derivedStat.weights.health +
    attributes.magicka * derivedStat.weights.magicka +
    attributes.stamina * derivedStat.weights.stamina;
  const base = derivedStat.prefactor * (weighted / derivedStat.threshold);
  return Math.round(base * 100) / 100;
}


export function collectSourcedEffects(game: GameData, state: BuildState): SourcedEffect[] {
  return collectBuildChanges(game, state).sourcedEffects;
}

export function computeTrackedStats(
  game: GameData,
  state: BuildState,
  sourcedEffects: SourcedEffect[],
  attributes: Attributes,
): TrackedStatEntry[] {
  const race = resolveRace(game, state.raceId);
  const totals = new Map<string, number>();
  const sources = new Map<string, BonusSource[]>();
  const activeFlags = new Set<string>();

  for (const stat of ["health", "magicka", "stamina"] as const) {
    const raceBonus = race?.attributeBonus[stat] ?? 0;
    if (raceBonus !== 0) {
      addNumericEntry(totals, stat, raceBonus);
      addBonusSource(sources, stat, {
        name: race!.name,
        value: raceBonus,
        valueKind: "flat",
      });
    }

    const allocation = state.attributeBonus[stat] * getAttributePointsPerChoice(game, stat);
    if (allocation !== 0) {
      addNumericEntry(totals, stat, allocation);
      addBonusSource(sources, stat, {
        name: "attributeAllocation",
        labelKey: "attributeAllocation",
        value: allocation,
        valueKind: "flat",
      });
    }
  }

  for (const { source, labelKey, effect } of sourcedEffects) {
    applySourcedEffect(game, totals, sources, effect, { name: source, labelKey });
    if (effect.type === "flag") {
      activeFlags.add(effect.stat);
    }
  }

  for (const [statId, binding] of Object.entries(game.stats.raceBindings)) {
    const raceValue = race?.[binding.field] ?? 0;
    if (raceValue === 0) continue;
    const def = getStatDefinition(game.stats, statId);
    addNumericEntry(totals, statId, raceValue);
    addBonusSource(sources, statId, {
      name: race!.name,
      value: raceValue,
      valueKind: def?.valueKind ?? "flat",
      isPercent: def?.valueKind === "percent",
    });
  }

  for (const derivedStat of game.mechanics.derivedStats) {
    const derived = computeAttributeDerivedValue(derivedStat, attributes);
    if (derived === 0) continue;

    const def = getStatDefinition(game.stats, derivedStat.id);
    addNumericEntry(totals, derivedStat.id, derived);
    addBonusSource(sources, derivedStat.id, {
      name: "derivedFromAttributes",
      labelKey: "derivedFromAttributes",
      value: derived,
      valueKind: def?.valueKind ?? (derivedStat.isPercent ? "percent" : "flat"),
      isPercent: derivedStat.isPercent,
    });
  }

  const categoryOrder = new Map(game.stats.categories.map((category, index) => [category.id, index]));
  const statOrder = new Map(game.stats.stats.map((stat, index) => [stat.id, index]));

  const entries: TrackedStatEntry[] = [];

  for (const [statId, value] of totals) {
    const def = getStatDefinition(game.stats, statId);
    if (!def || def.valueKind === "flag") continue;

    entries.push({
      id: statId,
      label: def.label,
      category: def.category,
      value,
      valueKind: def.valueKind,
      isPercent: def.valueKind === "percent",
      sources: sources.get(statId) ?? [],
    });
  }

  for (const statId of activeFlags) {
    const def = getStatDefinition(game.stats, statId);
    if (!def || def.valueKind !== "flag") continue;

    entries.push({
      id: statId,
      label: def.label,
      category: def.category,
      value: 1,
      valueKind: "flag",
      isPercent: false,
      sources: sources.get(statId) ?? [],
    });
  }

  entries.sort((a, b) => {
    const categoryDiff =
      (categoryOrder.get(a.category) ?? Number.MAX_SAFE_INTEGER) -
      (categoryOrder.get(b.category) ?? Number.MAX_SAFE_INTEGER);
    if (categoryDiff !== 0) return categoryDiff;
    return (statOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (statOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER);
  });

  return entries;
}

function formatRoundedStatNumber(value: number): string {
  return Number(value.toFixed(2)).toString();
}

export function formatTrackedStatValue(entry: TrackedStatEntry): string {
  if (entry.valueKind === "flag") return "Yes";
  const sign = entry.value > 0 ? "+" : "";
  return `${sign}${formatRoundedStatNumber(entry.value)}${entry.isPercent ? "%" : ""}`;
}

export function formatBonusSourceValue(source: BonusSource): string {
  if (source.valueKind === "flag") return "Yes";
  const isPercent = source.isPercent ?? source.valueKind === "percent";
  const sign = source.value > 0 ? "+" : "";
  return `${sign}${formatRoundedStatNumber(source.value)}${isPercent ? "%" : ""}`;
}

export function resolveBonusSourceName(
  source: BonusSource,
  labels: Record<string, string>,
): string {
  if (source.labelKey) {
    return labels[source.labelKey] ?? source.name;
  }
  return source.name;
}
