/** Run work after the next paint in the browser; run immediately under Vitest. */
export function scheduleAfterPaint(task: () => void): void {
  if (import.meta.env.VITEST) {
    task();
    return;
  }

  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(task);
    return;
  }

  queueMicrotask(task);
}
