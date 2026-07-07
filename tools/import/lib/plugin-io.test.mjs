import assert from "node:assert/strict";
import { mapConcurrent } from "./plugin-io.mjs";

const order = [];
const results = await mapConcurrent([1, 2, 3, 4, 5], 3, async (value) => {
  order.push(value);
  await new Promise((resolve) => setTimeout(resolve, 5 - value));
  return value * 10;
});

assert.deepEqual(results, [10, 20, 30, 40, 50]);
assert.deepEqual(order.sort((a, b) => a - b), [1, 2, 3, 4, 5]);

const workerEvents = [];
await mapConcurrent([10, 20, 30], 2, async (value, index, workerId) => {
  workerEvents.push({ type: "run", value, index, workerId });
  return value;
}, {
  onWorkerStart(workerId, item, index) {
    workerEvents.push({ type: "start", workerId, item, index });
  },
  onWorkerEnd(workerId, item, index) {
    workerEvents.push({ type: "end", workerId, item, index });
  },
});

assert.equal(workerEvents.filter((event) => event.type === "start").length, 3);
assert.equal(workerEvents.filter((event) => event.type === "end").length, 3);
assert.ok(workerEvents.some((event) => event.type === "start" && event.workerId === 0));
assert.ok(workerEvents.some((event) => event.type === "start" && event.workerId === 1));

console.log("plugin-io.test.mjs: ok");
