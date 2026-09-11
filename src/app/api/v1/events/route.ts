/** POST /api/v1/events — opt-in count-only analytics forwarder. */
import type { NextRequest } from "next/server";
import { z } from "zod";

import { getOmnisource } from "@/lib/omnisource";
import { fail, ok } from "@/lib/omnisource/http";

export const dynamic = "force-dynamic";

const EventSchema = z.object({
  type: z.string().min(1).max(64),
  appId: z.string().max(255).optional(),
  metadata: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  occurredAt: z.string().optional(),
});

const BodySchema = z.object({ events: z.array(EventSchema).min(1).max(50) });

export async function POST(request: NextRequest) {
  try {
    const parsed = BodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: { code: "bad_request", message: "Invalid events" } }, { status: 400 });
    }
    await getOmnisource().analyticsApi.flush({
      method: "POST",
      body: { events: parsed.data.events },
      retries: 0,
      timeoutMs: 5000,
    });
    return ok({ accepted: parsed.data.events.length });
  } catch (error) {
    return fail(error);
  }
}
