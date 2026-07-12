import { useEffect, useRef, useState } from "react";
import type { PerkTree } from "@/data/schemas";
import { TreeMiniPreview } from "@/components/TreeMiniPreview";
import { cn } from "@/lib/utils";

interface LazyTreeMiniPreviewProps {
  tree: PerkTree;
  conflictPerkIds?: string[];
  searchPerkPositionKeys?: ReadonlySet<string>;
  className?: string;
}

/**
 * Mounts the SVG mini tree only after the tile scrolls into (or near) view.
 * Keeps off-screen sidebar tiles from reconciling on every build change.
 */
export function LazyTreeMiniPreview({
  tree,
  conflictPerkIds,
  searchPerkPositionKeys,
  className,
}: LazyTreeMiniPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldMount, setShouldMount] = useState(false);

  useEffect(() => {
    if (shouldMount) return;

    const element = containerRef.current;
    if (!element) return;

    if (typeof IntersectionObserver === "undefined") {
      setShouldMount(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setShouldMount(true);
        observer.disconnect();
      },
      { rootMargin: "120px 0px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [shouldMount]);

  return (
    <div
      ref={containerRef}
      className={cn(className, "h-full w-full")}
      style={{ contentVisibility: shouldMount ? undefined : "auto" }}
    >
      {shouldMount ? (
        <TreeMiniPreview
          tree={tree}
          conflictPerkIds={conflictPerkIds}
          searchPerkPositionKeys={searchPerkPositionKeys}
          className="h-full w-full"
        />
      ) : null}
    </div>
  );
}
