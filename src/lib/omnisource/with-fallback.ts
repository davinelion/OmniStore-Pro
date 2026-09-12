/**
 * Graceful degradation for server-rendered reads.
 *
 * A catalog page is worth more than an error boundary: when one OmniSource
 * read fails the page should still render with that section empty, exactly as
 * the homepage already does with `Promise.allSettled`. Without this a single
 * failing read turns the whole route into a 500.
 *
 * Failures are logged with their route context so a degraded page is visible in
 * the deploy logs rather than silently empty.
 */

export async function orFallback<T>(
  read: Promise<T>,
  fallback: T,
  label: string,
): Promise<T> {
  try {
    return await read;
  } catch (error) {
    console.error(
      `[omnistore] ${label} failed, rendering without it: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return fallback;
  }
}

/** Variant for reads that resolve to an array — the common case. */
export async function orEmpty<T>(read: Promise<T[]>, label: string): Promise<T[]> {
  return orFallback(read, [], label);
}
