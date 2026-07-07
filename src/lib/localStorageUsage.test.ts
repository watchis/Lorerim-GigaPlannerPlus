import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  formatStorageSize,
  getAppLocalStorageUsage,
  getAppLocalStorageUsageBytes,
  getLocalStorageEntryByteSize,
  getLocalStorageUsage,
  getLocalStorageUsageForKeys,
  getStorageUsageLevel,
  LOCAL_STORAGE_QUOTA_BYTES,
} from "@/lib/localStorageUsage";
import { APP_STORAGE_KEYS, LIBRARY_STORAGE_KEY } from "@/store/savedBuilds";

describe("localStorageUsage", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => null),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("counts UTF-16 byte size for a storage entry", () => {
    expect(getLocalStorageEntryByteSize("key", "value")).toBe(16);
  });

  it("sums usage for app storage keys only", () => {
    const getItem = vi.fn((key: string) => {
      if (key === LIBRARY_STORAGE_KEY) return '{"state":{}}';
      return null;
    });
    vi.stubGlobal("localStorage", { getItem });

    expect(getLocalStorageUsageForKeys(APP_STORAGE_KEYS)).toBe(
      getLocalStorageEntryByteSize(LIBRARY_STORAGE_KEY, '{"state":{}}'),
    );
    expect(getAppLocalStorageUsageBytes()).toBe(
      getLocalStorageEntryByteSize(LIBRARY_STORAGE_KEY, '{"state":{}}'),
    );
  });

  it("returns zero when storage is unavailable or empty", () => {
    expect(getLocalStorageUsageForKeys(APP_STORAGE_KEYS)).toBe(0);
    expect(getAppLocalStorageUsageBytes()).toBe(0);
  });

  it("computes percent used and warning levels", () => {
    const warningBytes = LOCAL_STORAGE_QUOTA_BYTES * 0.85;
    const criticalBytes = LOCAL_STORAGE_QUOTA_BYTES * 0.97;

    expect(getStorageUsageLevel(50)).toBe("normal");
    expect(getStorageUsageLevel(85)).toBe("warning");
    expect(getStorageUsageLevel(97)).toBe("critical");

    const warningUsage = getLocalStorageUsage(warningBytes);
    expect(warningUsage.level).toBe("warning");
    expect(warningUsage.percentUsed).toBeCloseTo(85, 5);

    const criticalUsage = getLocalStorageUsage(criticalBytes);
    expect(criticalUsage.level).toBe("critical");
  });

  it("caps displayed percent at 100", () => {
    const usage = getLocalStorageUsage(LOCAL_STORAGE_QUOTA_BYTES * 2);
    expect(usage.percentUsed).toBe(100);
  });

  it("formats storage sizes for display", () => {
    expect(formatStorageSize(512)).toBe("512 B");
    expect(formatStorageSize(1536)).toBe("1.5 KB");
    expect(formatStorageSize(5 * 1024 * 1024)).toBe("5.0 MB");
  });

  it("builds app usage snapshot from localStorage", () => {
    const payload = '{"state":{"savedBuilds":[]}}';
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => (key === LIBRARY_STORAGE_KEY ? payload : null)),
    });

    const usage = getAppLocalStorageUsage();
    expect(usage.usedBytes).toBe(getLocalStorageEntryByteSize(LIBRARY_STORAGE_KEY, payload));
    expect(usage.quotaBytes).toBe(LOCAL_STORAGE_QUOTA_BYTES);
    expect(usage.level).toBe("normal");
  });
});
