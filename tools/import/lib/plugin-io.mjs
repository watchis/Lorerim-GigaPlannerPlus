import * as tesData from "@fcrick/tes-data";

export function getRecordBufferAsync(file, offset) {
  return new Promise((resolve, reject) => {
    tesData.getRecordBuffer(file, offset, (err, buffer) => (err ? reject(err) : resolve(buffer)));
  });
}

export function visitAsync(file) {
  const offsets = [];
  return new Promise((resolve, reject) => {
    tesData.visit(file, {
      visitOffset(offset, type) {
        offsets.push([offset, type]);
      },
      done() {
        resolve(offsets);
      },
      error: reject,
    });
  });
}

/**
 * Run an async mapper over items with a fixed worker pool. Results preserve input order.
 *
 * Optional hooks receive `workerId` (0-based pool slot) for progress UIs.
 */
export async function mapConcurrent(items, concurrency, fn, hooks = null) {
  if (items.length === 0) return [];

  const results = new Array(items.length);
  let nextIndex = 0;
  const workers = Math.min(Math.max(1, concurrency), items.length);

  async function worker(workerId) {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      const item = items[index];
      hooks?.onWorkerStart?.(workerId, item, index);
      try {
        results[index] = await fn(item, index, workerId);
      } finally {
        hooks?.onWorkerEnd?.(workerId, item, index);
      }
    }
  }

  await Promise.all(Array.from({ length: workers }, (_, workerId) => worker(workerId)));
  return results;
}
