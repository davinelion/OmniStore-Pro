/** GET /api/v1/latest — recently released/updated apps (v1 wire pass-through). */
import { getOmnisource } from "@/lib/omnisource";
import { AppDtoSchema } from "@omnistore/shared-models";
import { fail, ok } from "@/lib/omnisource/http";
import { z } from "zod";

export const revalidate = 300;

export async function GET() {
  try {
    const dto = await getOmnisource().request("/latest", z.array(AppDtoSchema), {
      tags: ["latest"],
      revalidate: 300,
    });
    return ok(dto);
  } catch (error) {
    return fail(error);
  }
}
