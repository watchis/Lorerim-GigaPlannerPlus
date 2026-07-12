import { useEffect, useState } from "react";

/**
 * Returns true after the browser has a chance to paint, so heavy child trees
 * can mount without blocking the interaction that toggled `active`.
 */
export function useDeferredRender(active: boolean, idleTimeoutMs = 120): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!active) {
      setReady(false);
      return;
    }

    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(() => setReady(true), { timeout: idleTimeoutMs });
      return () => cancelIdleCallback(id);
    }

    const id = window.setTimeout(() => setReady(true), 16);
    return () => clearTimeout(id);
  }, [active, idleTimeoutMs]);

  return ready;
}
