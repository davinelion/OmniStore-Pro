import { NextResponse } from "next/server";
import { getCategories } from "@/lib/api/catalog";

export const revalidate = 3600;

export async function GET() {
  const items = await getCategories();
  return NextResponse.json({ items });
}
