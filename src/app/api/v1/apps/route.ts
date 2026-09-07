import { NextRequest, NextResponse } from "next/server";
import { queryApps } from "@/lib/api/catalog";

export const revalidate = 300;

export async function GET(req: NextRequest) {
  const p = Object.fromEntries(req.nextUrl.searchParams.entries());
  const data = await queryApps(p);
  return NextResponse.json(data);
}
