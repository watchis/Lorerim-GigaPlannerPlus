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
 */
export async function mapConcurrent(items, concurrency, fn) {
  if (items.length === 0) return [];

  const results = new Array(items.length);
  let nextIndex = 0;
  const workers = Math.min(Math.max(1, concurrency), items.length);

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await fn(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}
