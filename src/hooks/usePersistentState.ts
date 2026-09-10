"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { z } from "zod";

/** Validated local state; failed writes stay visible in memory and surface a warning. */
export function usePersistentState<T>(
  key: string,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  initial: T,
) {
  const [value, setValue] = useState(initial);
  const current = useRef(initial);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    function load() {
      try {
        const raw = localStorage.getItem(key);
        const next = raw ? schema.parse(JSON.parse(raw)) : initial;
        current.current = next;
        setValue(next);
        setError("");
      } catch {
        setError(
          "Local data could not be loaded. Export a backup before leaving if storage is unavailable.",
        );
      }
      setReady(true);
    }
    load();
    const onStorage = (event: StorageEvent) => {
      if (event.key === key || event.key === null) load();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [key, schema, initial]);
  const update = useCallback(
    (fn: (previous: T) => T) => {
      const next = schema.parse(fn(current.current));
      current.current = next;
      setValue(next);
      try {
        localStorage.setItem(key, JSON.stringify(next));
        setError("");
      } catch {
        setError(
          "Changes are only in memory: browser storage is unavailable or full. Export a backup.",
        );
      }
    },
    [key, schema],
  );
  return { value, update, ready, error };
}
