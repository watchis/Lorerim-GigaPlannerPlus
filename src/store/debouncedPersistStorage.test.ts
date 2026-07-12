import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createDebouncedPersistStorage,
  flushDebouncedPersistStorage,
} from "@/store/debouncedPersistStorage";

function createStorageMock(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key) => store.get(key) ?? null,
    key: (index) => [...store.keys()][index] ?? null,
    removeItem: (key) => {
      store.delete(key);
    },
    setItem: (key, value) => {
      store.set(key, value);
    },
  };
}

describe("debouncedPersistStorage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces writes until flush or timeout", () => {
    const backing = createStorageMock();
    const storage = createDebouncedPersistStorage(backing, 250);

    storage.setItem("library", '{"state":{}}');
    expect(backing.getItem("library")).toBeNull();

    vi.advanceTimersByTime(249);
    expect(backing.getItem("library")).toBeNull();

    vi.advanceTimersByTime(1);
    expect(backing.getItem("library")).toBe('{"state":{}}');
  });

  it("flushDebouncedPersistStorage writes immediately", () => {
    const backing = createStorageMock();
    const storage = createDebouncedPersistStorage(backing, 250);

    storage.setItem("library", '{"flushed":true}');
    flushDebouncedPersistStorage(storage);

    expect(backing.getItem("library")).toBe('{"flushed":true}');
  });

  it("works with zustand persist middleware", async () => {
    const { create } = await import("zustand");
    const { createJSONStorage, persist } = await import("zustand/middleware");
    const backing = createStorageMock();
    const debounced = createDebouncedPersistStorage(backing);
    const useStore = create(
      persist(
        () => ({ notes: "" }),
        {
          name: "test-library",
          storage: createJSONStorage(() => debounced),
          partialize: (state) => ({ notes: state.notes }),
        },
      ),
    );

    useStore.setState({ notes: "hello" });
    flushDebouncedPersistStorage(debounced);

    expect(backing.getItem("test-library")).toContain("hello");
  });
});
