/** POST /api/v1/me/session — pseudonymous sign-in for library cloud sync. */
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

import { deriveSubject, SUBJECT_COOKIE } from "@/lib/omnisource/subject";

export const dynamic = "force-dynamic";

const BodySchema = z.object({ email: z.string().email().max(254) });

export async function POST(request: NextRequest) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: { code: "bad_request", message: "Valid email required" } }, { status: 400 });
  }
  const subject = deriveSubject(parsed.data.email);
  const store = await cookies();
  store.set(SUBJECT_COOKIE, subject, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
  return Response.json({ ok: true });
}

export async function DELETE() {
  const store = await cookies();
  store.delete(SUBJECT_COOKIE);
  return Response.json({ ok: true });
}
