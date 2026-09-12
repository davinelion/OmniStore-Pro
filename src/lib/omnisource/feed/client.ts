/**
 * FeedBackedClient — an OmniSourceClient that answers from the bundled feed.
 *
 * It is a drop-in replacement for the HTTP client: it extends the same class,
 * so every endpoint group (`AppsApi`, `SearchApi`, …) and every caller
 * (`getApps`, `search`, `getTrust`, …) works unchanged. Only `request()` is
 * overridden — instead of a network call it routes the path through the
 * in-process feed router and validates the result with the caller's schema.
 *
 * Why this shape: the feed router reads from disk, so it must never enter the
 * browser bundle. This module deliberately has no `node:*` import — the router
 * is pulled in with a dynamic import that only ever runs on the server, which
 * keeps the 12 MB catalog and `node:fs` out of the client graph entirely.
 *
 * Used only when no `OMNISOURCE_API_URL` is configured. Point OmniStore at a
 * live OmniSource deployment and this class is never constructed.
 */

import {
  OmniSourceClient,
  OmniSourceError,
  type OmniSourceClientOptions,
  type RequestOptions,
  type Validator,
} from "../client";

/** Sentinel base URL that selects the bundled-feed data path. */
export const FEED_BASE_URL = "feed://bundled";

export class FeedBackedClient extends OmniSourceClient {
  constructor(options: OmniSourceClientOptions = {}) {
    super(FEED_BASE_URL, undefined, options);
  }

  /** Serve a request from the bundled feed instead of the network. */
  override async request<T>(
    path: string,
    schema: Validator<T>,
    options: RequestOptions = {},
  ): Promise<T> {
    // Aborted callers should not pay for a read.
    if (options.signal?.aborted) {
      throw new OmniSourceError(0, "aborted", "Request aborted", path);
    }

    let data: unknown;
    try {
      // Server-only: `./router` reaches `node:fs`. Never loaded in a browser.
      const { serveFeedRequest, FeedRequestError } = await import("./router");
      try {
        data = await serveFeedRequest(path);
      } catch (error) {
        if (error instanceof FeedRequestError) {
          throw new OmniSourceError(error.status, error.code, error.message, path);
        }
        throw error;
      }
    } catch (error) {
      if (error instanceof OmniSourceError) throw error;
      throw new OmniSourceError(
        502,
        "feed_unavailable",
        error instanceof Error ? error.message : "Bundled feed unavailable",
        path,
      );
    }

    // Same contract enforcement as the HTTP path: a malformed payload degrades
    // to a typed error rather than reaching a component half-formed.
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      throw new OmniSourceError(
        502,
        "schema_mismatch",
        "Bundled feed response did not match the OmniSource v1 contract",
        path,
      );
    }
    return parsed.data;
  }

  /**
   * The bundled feed is always available once it has loaded — there is no
   * upstream to probe, so report health without making a request.
   */
  override async probeHealth(): Promise<{ status?: string } | null> {
    try {
      const { loadFeed } = await import("./catalog");
      await loadFeed();
      return { status: "ok" };
    } catch {
      return null;
    }
  }
}
