import { APP_STORAGE_KEYS } from "@/store/savedBuilds";

/** Typical per-origin localStorage quota used for display and warnings. */
export const LOCAL_STORAGE_QUOTA_BYTES = 5 * 1024 * 1024;

const WARNING_THRESHOLD = 0.8;
const CRITICAL_THRESHOLD = 0.95;

export type StorageUsageLevel = "normal" | "warning" | "critical";

export interface LocalStorageUsage {
  usedBytes: number;
  quotaBytes: number;
  percentUsed: number;
  level: StorageUsageLevel;
}

function getStoredStringByteSize(value: string): number {
  return value.length * 2;
}

export function getLocalStorageEntryByteSize(key: string, value: string): number {
  return getStoredStringByteSize(key) + getStoredStringByteSize(value);
}

export function getLocalStorageUsageForKeys(keys: readonly string[]): number {
  if (typeof localStorage === "undefined") return 0;

  try {
    let total = 0;
    for (const key of keys) {
      const value = localStorage.getItem(key);
      if (value === null) continue;
      total += getLocalStorageEntryByteSize(key, value);
    }
    return total;
  } catch {
    return 0;
  }
}

export function getAppLocalStorageUsageBytes(): number {
  return getLocalStorageUsageForKeys(APP_STORAGE_KEYS);
}

export function getStorageUsageLevel(percentUsed: number): StorageUsageLevel {
  if (percentUsed >= CRITICAL_THRESHOLD * 100) return "critical";
  if (percentUsed >= WARNING_THRESHOLD * 100) return "warning";
  return "normal";
}

export function getLocalStorageUsage(
  usedBytes: number,
  quotaBytes: number = LOCAL_STORAGE_QUOTA_BYTES,
): LocalStorageUsage {
  const percentUsed = quotaBytes > 0 ? Math.min(100, (usedBytes / quotaBytes) * 100) : 0;

  return {
    usedBytes,
    quotaBytes,
    percentUsed,
    level: getStorageUsageLevel(percentUsed),
  };
}

export function getAppLocalStorageUsage(): LocalStorageUsage {
  return getLocalStorageUsage(getAppLocalStorageUsageBytes());
}

export function formatStorageSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;

  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  }

  const mb = kb / 1024;
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}
