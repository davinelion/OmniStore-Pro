import { NextResponse } from "next/server";
import { PLATFORMS } from "@/config/site";

export const revalidate = 3600;

export async function GET() {
  return NextResponse.json({ items: PLATFORMS });
}
