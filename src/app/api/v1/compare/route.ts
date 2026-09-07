import { NextRequest, NextResponse } from "next/server";
import { getRelated } from "@/lib/api/catalog";

export async function GET(req: NextRequest) {
  const ids = (req.nextUrl.searchParams.get("ids") ?? "").split(",").filter(Boolean);
  const items = await getRelated(ids.slice(0, 4));
  return NextResponse.json({ items });
}
