import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from "react";

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

  useLayoutEffect(() => {
    revisionRef.current = revision;
    runLayout();

    let frame2 = 0;
    let frame3 = 0;
    const frame1 = requestAnimationFrame(() => {
      if (revisionRef.current !== revision) return;
      runLayout();
      frame2 = requestAnimationFrame(() => {
        if (revisionRef.current !== revision) return;
        runLayout();
        frame3 = requestAnimationFrame(() => {
          if (revisionRef.current !== revision) return;
          runLayout();
        });
      });
    });

    return () => {
      cancelAnimationFrame(frame1);
      cancelAnimationFrame(frame2);
      cancelAnimationFrame(frame3);
    };
  }, [runLayout, revision]);

  return placements;
}
