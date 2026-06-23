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

console.log("plugin-io.test.mjs: ok");
