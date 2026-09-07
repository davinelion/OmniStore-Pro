import { NextRequest, NextResponse } from "next/server";
import { queryApps } from "@/lib/api/catalog";

export async function GET(req: NextRequest) {
  const p = Object.fromEntries(req.nextUrl.searchParams.entries());
  const data = await queryApps(p);
  return NextResponse.json(data);
}
