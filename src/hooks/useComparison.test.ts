/** @vitest-environment jsdom */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { MAX_COMPARE, comparisonStore, useComparison } from "./useComparison";

/**
 * Comparison selection is capped: a table with a dozen columns is useless, and
 * the cap must be enforced rather than silently dropped.
 */

beforeEach(() => {
  comparisonStore.clear();
});

describe("useComparison", () => {
  it("starts empty", () => {
    const { result } = renderHook(() => useComparison());
    expect(result.current.ids).toEqual([]);
    expect(result.current.isFull).toBe(false);
  });

  it("adds and removes", () => {
    const { result } = renderHook(() => useComparison());
    act(() => {
      result.current.add("localsend");
    });
    expect(result.current.has("localsend")).toBe(true);
    act(() => {
      result.current.remove("localsend");
    });
    expect(result.current.has("localsend")).toBe(false);
  });

  it("toggles both ways", () => {
    const { result } = renderHook(() => useComparison());
    act(() => {
      expect(result.current.toggle("a")).toBe(true);
    });
    act(() => {
      expect(result.current.toggle("a")).toBe(false);
    });
  });

  it(`caps the selection at ${MAX_COMPARE}`, () => {
    const { result } = renderHook(() => useComparison());
    act(() => {
      for (let i = 0; i < MAX_COMPARE + 2; i += 1) result.current.add(`app-${i}`);
    });
    expect(result.current.ids).toHaveLength(MAX_COMPARE);
    expect(result.current.isFull).toBe(true);
    act(() => {
      expect(result.current.add("one-more")).toBe(false);
    });
  });

  it("ignores duplicates", () => {
    const { result } = renderHook(() => useComparison());
    act(() => {
      result.current.add("a");
      result.current.add("a");
    });
    expect(result.current.ids).toEqual(["a"]);
  });

  it("clears", () => {
    const { result } = renderHook(() => useComparison());
    act(() => {
      result.current.add("a");
      result.current.clear();
    });
    expect(result.current.ids).toEqual([]);
  });

  it("shares state between hook instances (localStorage-backed)", () => {
    const first = renderHook(() => useComparison());
    act(() => {
      first.result.current.add("shared");
    });
    const second = renderHook(() => useComparison());
    expect(second.result.current.has("shared")).toBe(true);
  });
});
