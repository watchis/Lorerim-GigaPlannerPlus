import { useEffect, useRef, useState } from "react";
import {
  type MarkdownToolbarItemId,
  computeHiddenMarkdownToolbarItems,
  isMarkdownToolbarItemVisible,
  readMarkdownToolbarLayoutMetrics,
} from "@/lib/markdownToolbarPriority";

export function useResponsiveMarkdownToolbar() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hiddenItems, setHiddenItems] = useState<ReadonlySet<MarkdownToolbarItemId>>(() => new Set());

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const update = () => {
      const metrics = readMarkdownToolbarLayoutMetrics(container);
      setHiddenItems(computeHiddenMarkdownToolbarItems(metrics));
    };

    const observer = new ResizeObserver(update);
    observer.observe(container);
    update();

    return () => observer.disconnect();
  }, []);

  return {
    containerRef,
    hiddenItems,
    isItemVisible: (itemId: MarkdownToolbarItemId) =>
      isMarkdownToolbarItemVisible(itemId, hiddenItems),
  };
}
