import { NextResponse } from "next/server";
import { getLatest } from "@/lib/api/catalog";

export async function GET() {
  return NextResponse.json(await getLatest());
}
