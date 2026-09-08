/**
 * Shared test environment.
 *
 * - jest-dom matchers for readable DOM assertions.
 * - No localStorage polyfill: components that touch storage must survive its
 *   absence (SSR), which is exactly what the in-memory fallback in
 *   src/lib/favorites/store.ts guarantees.
 */
import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
