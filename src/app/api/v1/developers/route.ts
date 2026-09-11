/** GET /api/v1/developers — all indexed developers (v1 wire pass-through). */
import type { NextRequest } from "next/server";

import { getOmnisource } from "@/lib/omnisource";
import { DeveloperRecordDtoSchema } from "@omnistore/shared-models";
import { fail, ok } from "@/lib/omnisource/http";
import { z } from "zod";

export const revalidate = 1800;

export async function GET(_request: NextRequest) {
  try {
    const dto = await getOmnisource().request("/developers", z.array(DeveloperRecordDtoSchema), {
      tags: ["developers"],
      revalidate: 1800,
    });
    return ok(dto);
  } catch (error) {
    return fail(error);
  }
}
