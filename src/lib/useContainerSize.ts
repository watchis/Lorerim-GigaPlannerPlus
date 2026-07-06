import { useEffect, useRef, useState } from "react";

export function useContainerSize<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const update = () => {
      setSize({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    };

    const observer = new ResizeObserver(update);
    observer.observe(element);
    update();

    return () => observer.disconnect();
  }, []);

  return { ref, ...size };
}

/** Pick a readable column count for skill mini-tree grids from container width. */
export function getSkillGridColumnCount(
  containerWidth: number,
  options: { minCellWidth?: number; maxColumns?: number } = {},
): number {
  const { minCellWidth = 108, maxColumns = 4 } = options;

  if (containerWidth <= 0) return 2;

  return Math.max(2, Math.min(maxColumns, Math.floor(containerWidth / minCellWidth)));
}
