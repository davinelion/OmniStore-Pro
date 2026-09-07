/**
 * Provider selection.
 *
 * One line decides where OmniStore's data comes from. Nothing else in the
 * application knows the difference.
 */

import { site } from "@/config/site";
import { localFeedProvider } from "./local-provider";
import { HttpOmniSourceProvider } from "./http-provider";
import type { OmniSourceProvider } from "./provider";

let instance: OmniSourceProvider | null = null;

export function getProvider(): OmniSourceProvider {
  if (instance) return instance;
  instance = site.omnisourceUrl
    ? new HttpOmniSourceProvider(site.omnisourceUrl)
    : localFeedProvider;
  return instance;
}

export { localFeedProvider };
export type { OmniSourceProvider } from "./provider";
export type * from "./provider";
