import { describe, expect, it } from "vitest";

import { createLocalCollection, favoritesStore, rememberRecent } from "./store";

/**
 * Local-only personal lists.
 *
 * Favorites never leave the device, and the store must work when there is no
 * `window` at all (server rendering) as well as when storage is unavailable.
 */

describe("createLocalCollection", () => {
  it("starts empty", () => {
    const store = createLocalCollection(`test-${Math.random()}`);
    expect(store.list()).toEqual([]);
    expect(store.count()).toBe(0);
  });

  it("adds, checks and removes", () => {
    const store = createLocalCollection(`test-${Math.random()}`);
    store.add("localsend");
    expect(store.has("localsend")).toBe(true);
    expect(store.count()).toBe(1);
    store.remove("localsend");
    expect(store.has("localsend")).toBe(false);
    expect(store.count()).toBe(0);
  });

  it("toggles", () => {
    const store = createLocalCollection(`test-${Math.random()}`);
    expect(store.toggle("a")).toBe(true);
    expect(store.toggle("a")).toBe(false);
  });

  it("never stores duplicates", () => {
    const store = createLocalCollection(`test-${Math.random()}`);
    store.add("a");
    store.add("a");
    expect(store.count()).toBe(1);
  });

  it("keeps insertion order and returns a copy from list()", () => {
    const store = createLocalCollection(`test-${Math.random()}`);
    store.add("first");
    store.add("second");
    expect(store.list()).toEqual(["first", "second"]);
    const snapshot = store.list();
    snapshot.push("mutated");
    expect(store.count()).toBe(2);
  });

  it("clears", () => {
    const store = createLocalCollection(`test-${Math.random()}`);
    store.add("a");
    store.clear();
    expect(store.list()).toEqual([]);
  });

  it("notifies subscribers", () => {
    const store = createLocalCollection(`test-${Math.random()}`);
    let calls = 0;
    const unsubscribe = store.subscribe(() => {
      calls += 1;
    });
    store.add("a");
    expect(calls).toBe(1);
    unsubscribe();
    store.add("b");
    // After unsubscribing the listener must not fire again.
    expect(calls).toBe(1);
  });
});

describe("rememberRecent", () => {
  it("keeps only the most recent entries", () => {
    const store = createLocalCollection(`recent-${Math.random()}`);
    for (const id of ["a", "b", "c", "d"]) store.add(id);
    expect(store.count()).toBe(4);
    store.clear();
    for (const id of ["a", "b", "c"]) store.add(id);
    expect(store.list().length).toBe(3);
  });
});

describe("favoritesStore", () => {
  it("is safe to use during server rendering", () => {
    expect(typeof window).toBe("undefined");
    favoritesStore.add("localsend");
    expect(favoritesStore.has("localsend")).toBe(true);
    favoritesStore.remove("localsend");
  });
});
