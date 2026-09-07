import { NextResponse } from "next/server";
import { getHome } from "@/lib/api/catalog";

export async function GET() {
  return NextResponse.json(await getHome());
}
