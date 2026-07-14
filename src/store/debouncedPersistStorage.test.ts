import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createDebouncedJSONStorage,
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
    const { persist } = await import("zustand/middleware");
    const backing = createStorageMock();
    const debounced = createDebouncedPersistStorage(backing);
    const useStore = create(
      persist(
        () => ({ notes: "" }),
        {
          name: "test-library",
          storage: {
            getItem: (name) => {
              const raw = debounced.getItem(name);
              return raw ? JSON.parse(raw) : null;
            },
            setItem: (name, value) => {
              debounced.setItem(name, JSON.stringify(value));
            },
            removeItem: (name) => debounced.removeItem(name),
          },
          partialize: (state) => ({ notes: state.notes }),
        },
      ),
    );

    useStore.setState({ notes: "hello" });
    flushDebouncedPersistStorage(debounced);

    expect(backing.getItem("test-library")).toContain("hello");
  });

  it("debounces JSON serialization and writes for zustand persist", async () => {
    const { create } = await import("zustand");
    const { persist } = await import("zustand/middleware");
    const backing = createStorageMock();
    const debounced = createDebouncedJSONStorage(() => backing, 250);
    const stringifySpy = vi.spyOn(JSON, "stringify");
    const useStore = create(
      persist(
        () => ({ notes: "" }),
        {
          name: "test-library",
          storage: debounced,
          partialize: (state) => ({ notes: state.notes }),
        },
      ),
    );

    useStore.setState({ notes: "one" });
    useStore.setState({ notes: "two" });
    expect(stringifySpy).not.toHaveBeenCalled();
    expect(backing.getItem("test-library")).toBeNull();

    vi.advanceTimersByTime(250);
    expect(stringifySpy).toHaveBeenCalledTimes(1);
    expect(backing.getItem("test-library")).toContain("two");

    stringifySpy.mockRestore();
  });

  it("returns null when persisted JSON is corrupt instead of throwing", () => {
    const backing = createStorageMock();
    backing.setItem("test-library", "{not-json");
    const storage = createDebouncedJSONStorage(() => backing);
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(storage.getItem("test-library")).toBeNull();
    spy.mockRestore();
  });
});
