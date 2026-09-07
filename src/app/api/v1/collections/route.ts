import { NextResponse } from "next/server";
import { collections } from "@/config/collections";

export async function GET() {
  return NextResponse.json({ items: collections });
}
