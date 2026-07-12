import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import {
  collectPerkBadgeLayoutNodes,
  layoutPerkBadgePlacements,
  perkBadgePlacementsEqual,
  resolvePerkBadgeLayoutBounds,
  type PerkBadgePlacement,
} from "@/lib/perkBadgeLayout";

export function usePerkBadgePlacements(
  containerRef: RefObject<HTMLElement | null>,
  revision: string,
): Map<string, PerkBadgePlacement> {
  const [placements, setPlacements] = useState<Map<string, PerkBadgePlacement>>(
    () => new Map(),
  );
  const revisionRef = useRef(revision);

  const runLayout = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const nodes = collectPerkBadgeLayoutNodes(container);
    if (nodes.length === 0) return;

    const next = layoutPerkBadgePlacements({
      nodes,
      bounds: resolvePerkBadgeLayoutBounds(container),
    });

    setPlacements((current) => (perkBadgePlacementsEqual(current, next) ? current : next));
  }, [containerRef]);

  useEffect(() => {
    revisionRef.current = revision;
    runLayout();

    const frame = requestAnimationFrame(() => {
      if (revisionRef.current !== revision) return;
      runLayout();
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [runLayout, revision]);

  return placements;
}
