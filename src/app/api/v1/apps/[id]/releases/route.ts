import { NextResponse } from "next/server";
import { getAppBySlug } from "@/lib/api/catalog";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const app = await getAppBySlug(params.id);
  if (!app) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ items: app.releases ?? [] });
}
