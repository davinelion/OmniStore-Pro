/** GET /api/v1/platforms — platform taxonomy (v1 wire pass-through). */
import { getOmnisource } from "@/lib/omnisource";
import { PlatformInfoDtoSchema } from "@omnistore/shared-models";
import { fail, ok } from "@/lib/omnisource/http";
import { z } from "zod";

export const revalidate = 1800;

export async function GET() {
  try {
    const dto = await getOmnisource().request("/platforms", z.array(PlatformInfoDtoSchema), {
      tags: ["platforms"],
      revalidate: 1800,
    });
    return ok(dto);
  } catch (error) {
    return fail(error);
  }
}
