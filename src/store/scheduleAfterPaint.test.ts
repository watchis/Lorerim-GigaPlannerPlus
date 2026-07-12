import { describe, expect, it, vi } from "vitest";
import { scheduleAfterPaint } from "@/store/scheduleAfterPaint";

describe("scheduleAfterPaint", () => {
  it("runs immediately under Vitest", () => {
    const task = vi.fn();
    scheduleAfterPaint(task);
    expect(task).toHaveBeenCalledTimes(1);
  });
});
