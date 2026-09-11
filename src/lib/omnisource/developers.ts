/**
 * Developers endpoint group — GET /api/v1/developers.
 */

import {
  DeveloperDetailSchema,
  DeveloperRecordDtoSchema,
  PaginatedAppsDtoSchema,
  mapDeveloper,
  mapDeveloperProfile,
  type Developer,
  type DeveloperProfile,
} from "@omnistore/shared-models";
import { z } from "zod";
import { OmniSourceError, type OmniSourceClient, type RequestOptions } from "./client";

const ListSchema = z.array(DeveloperRecordDtoSchema);

export class DevelopersApi {
  constructor(private readonly client: OmniSourceClient) {}

  /** All developers known to OmniSource. */
  async list(limit = 60, options: RequestOptions = {}): Promise<Developer[]> {
    const dto = await this.client.request("/developers", ListSchema, {
      tags: ["developers"],
      ...options,
    });
    return dto.slice(0, limit).map(mapDeveloper);
  }

  /** Developer profile with their apps, platforms and categories. */
  async get(id: string, options: RequestOptions = {}): Promise<DeveloperProfile | null> {
    let dto: z.infer<typeof DeveloperDetailSchema>;
    try {
      dto = await this.client.request(
        `/developers/${encodeURIComponent(id)}`,
        DeveloperDetailSchema,
        { tags: ["developers", `developer:${id}`], ...options },
      );
    } catch (error) {
      if (error instanceof OmniSourceError && error.status === 404) return null;
      throw error;
    }
    // The profile payload omits the app list; assemble it from the apps index.
    const apps = await this.client.request(
      `/apps?developer=${encodeURIComponent(id)}&per_page=100&sort=popularity`,
      PaginatedAppsDtoSchema,
      { tags: ["apps", `developer:${id}`], ...options },
    );
    return mapDeveloperProfile(dto, {
      apps: apps.items,
      platforms: [],
    });
  }
}
