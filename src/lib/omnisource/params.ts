/**
 * Query serialization shared by every endpoint group. One place, so every
 * client (web now, native later) builds identical OmniSource URLs.
 */

export type PrimitiveParams = Record<string, unknown>;

export function filtersToSearchParams(params: PrimitiveParams): URLSearchParams {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(camelToSnake(key), String(value));
  }
  return search;
}

function camelToSnake(key: string): string {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}
