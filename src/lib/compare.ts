/**
 * Comparison rules shared by server and client code.
 *
 * These constants live outside any `"use client"` module on purpose: values
 * exported from a client module become client references on the server, so a
 * server component importing them gets a proxy, not a number.
 */

/** A comparison table stops being readable past four columns. */
export const MAX_COMPARE = 4;
export const MIN_COMPARE = 2;
