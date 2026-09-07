import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const Report = z.object({
  appId: z.string().optional(),
  reason: z.enum([
    "Broken download",
    "Incorrect metadata",
    "Wrong platform",
    "Incorrect version",
    "Duplicate app",
    "License issue",
    "Security concern",
    "Other",
  ]),
  details: z.string().max(4000).optional(),
});

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = Report.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
