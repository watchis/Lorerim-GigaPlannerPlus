import type { PersistStorage, StorageValue } from "zustand/middleware";

const DEFAULT_DEBOUNCE_MS = 250;

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export interface DebouncedPersistStorage extends StorageLike {
  flush: () => void;
}

export interface DebouncedJSONPersistStorage<S> extends PersistStorage<S> {
  flush: () => void;
}

interface FlushableStorage {
  flush: () => void;
}

const activeDebouncedStorages = new Set<FlushableStorage>();

let beforeUnloadRegistered = false;

function ensureBeforeUnloadFlush(): void {
  if (beforeUnloadRegistered || typeof window === "undefined") return;
  if (typeof window.addEventListener !== "function") return;
  beforeUnloadRegistered = true;
  window.addEventListener("beforeunload", () => flushDebouncedPersistStorage());
}

function registerFlushable(storage: FlushableStorage): void {
  activeDebouncedStorages.add(storage);
  ensureBeforeUnloadFlush();
}

export function createDebouncedPersistStorage(
  storage: StorageLike,
  debounceMs = DEFAULT_DEBOUNCE_MS,
): DebouncedPersistStorage {
  let pendingKey: string | null = null;
  let pendingValue: string | null = null;
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  const writePending = (): void => {
    if (pendingKey == null || pendingValue == null) return;
    storage.setItem(pendingKey, pendingValue);
    pendingKey = null;
    pendingValue = null;
  };

  const debounced: DebouncedPersistStorage = {
    getItem: (name) => storage.getItem(name),
    setItem: (name, value) => {
      pendingKey = name;
      pendingValue = value;
      if (flushTimer != null) {
        clearTimeout(flushTimer);
      }
      flushTimer = setTimeout(() => {
        flushTimer = null;
        writePending();
      }, debounceMs);
    },
    removeItem: (name) => {
      if (pendingKey === name) {
        pendingKey = null;
        pendingValue = null;
        if (flushTimer != null) {
          clearTimeout(flushTimer);
          flushTimer = null;
        }
      }
      storage.removeItem(name);
    },
    flush: writePending,
  };

  registerFlushable(debounced);
  return debounced;
}

/** Debounce both JSON serialization and backing storage writes for zustand persist. */
export function createDebouncedJSONStorage<S>(
  getStorage: () => StorageLike,
  debounceMs = DEFAULT_DEBOUNCE_MS,
): DebouncedJSONPersistStorage<S> {
  let pendingKey: string | null = null;
  let pendingValue: StorageValue<S> | null = null;
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  const writePending = (): void => {
    if (pendingKey == null || pendingValue == null) return;
    getStorage().setItem(pendingKey, JSON.stringify(pendingValue));
    pendingKey = null;
    pendingValue = null;
  };

  const debounced: DebouncedJSONPersistStorage<S> = {
    getItem: (name) => {
      const raw = getStorage().getItem(name);
      if (!raw) return null;
      return JSON.parse(raw) as StorageValue<S>;
    },
    setItem: (name, value) => {
      pendingKey = name;
      pendingValue = value;
      if (flushTimer != null) {
        clearTimeout(flushTimer);
      }
      flushTimer = setTimeout(() => {
        flushTimer = null;
        writePending();
      }, debounceMs);
    },
    removeItem: (name) => {
      if (pendingKey === name) {
        pendingKey = null;
        pendingValue = null;
        if (flushTimer != null) {
          clearTimeout(flushTimer);
          flushTimer = null;
        }
      }
      getStorage().removeItem(name);
    },
    flush: writePending,
  };

  registerFlushable(debounced);
  return debounced;
}

/** Flush any debounced persist writes immediately (for tests and beforeunload). */
export function flushDebouncedPersistStorage(target?: FlushableStorage): void {
  if (target) {
    target.flush();
    return;
  }

  for (const debounced of activeDebouncedStorages) {
    debounced.flush();
  }
}
