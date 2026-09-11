/** GET /api/v1/trending — OmniSource trending (v1 wire pass-through). */
import { getOmnisource } from "@/lib/omnisource";
import { AppDtoSchema } from "@omnistore/shared-models";
import { fail, ok } from "@/lib/omnisource/http";
import { z } from "zod";

export const revalidate = 600;

export async function GET() {
  try {
    const dto = await getOmnisource().request("/trending", z.array(AppDtoSchema), {
      tags: ["trending"],
      revalidate: 600,
    });
    return ok(dto);
  } catch (error) {
    return fail(error);
  }
}
