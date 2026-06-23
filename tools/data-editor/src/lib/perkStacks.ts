type PerkNodeLike = {
  id?: unknown;
  name?: unknown;
  skillReq?: unknown;
  playerLevelReq?: unknown;
  description?: unknown;
  prerequisites?: unknown;
  prerequisitesAny?: unknown;
  position?: { x?: unknown; y?: unknown };
};

function isFiniteInt(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value);
}

function perkLevel(perk: PerkNodeLike): number {
  if (isFiniteInt(perk.skillReq)) return perk.skillReq;
  if (isFiniteInt(perk.playerLevelReq)) return perk.playerLevelReq;
  return 0;
}

export function getPerkPositionKey(perk: PerkNodeLike): string {
  const x = isFiniteInt(perk.position?.x) ? perk.position.x : 0;
  const y = isFiniteInt(perk.position?.y) ? perk.position.y : 0;
  return `${x},${y}`;
}

export function sortPerkStack(perks: PerkNodeLike[]): PerkNodeLike[] {
  return [...perks].sort((a, b) => perkLevel(a) - perkLevel(b));
}

export function groupPerksByPosition(perks: PerkNodeLike[]): Map<string, PerkNodeLike[]> {
  const byPosition = new Map<string, PerkNodeLike[]>();

  for (const perk of perks) {
    const key = getPerkPositionKey(perk);
    const group = byPosition.get(key);
    if (group) {
      group.push(perk);
    } else {
      byPosition.set(key, [perk]);
    }
  }

  return byPosition;
}

/** Lowest skill-requirement rank shown as the single layout node for a stack. */
export function getRepresentativePerk(stack: PerkNodeLike[]): PerkNodeLike {
  return sortPerkStack(stack)[0];
}

export function expandPerkIdsToStacks(
  perkIds: Iterable<string>,
  perks: PerkNodeLike[],
): string[] {
  const byId = new Map(perks.map((perk) => [String(perk.id), perk]));
  const byPosition = groupPerksByPosition(perks);
  const expanded = new Set<string>();

  for (const perkId of perkIds) {
    const perk = byId.get(perkId);
    if (!perk) continue;
    const stack = byPosition.get(getPerkPositionKey(perk)) ?? [perk];
    for (const member of stack) {
      expanded.add(String(member.id));
    }
  }

  return [...expanded];
}

export type LayoutPerkNode = {
  stack: PerkNodeLike[];
  perk: PerkNodeLike;
  stackIds: string[];
  positionKey: string;
};

export function getLayoutPerkNodes(perks: PerkNodeLike[]): LayoutPerkNode[] {
  return [...groupPerksByPosition(perks).values()].map((stack) => {
    const perk = getRepresentativePerk(stack);
    return {
      stack,
      perk,
      stackIds: stack.map((member) => String(member.id)),
      positionKey: getPerkPositionKey(perk),
    };
  });
}
