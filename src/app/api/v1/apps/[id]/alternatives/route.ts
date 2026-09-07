import { NextResponse } from "next/server";
import { getAppBySlug, getRelated } from "@/lib/api/catalog";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const app = await getAppBySlug(params.id);
  if (!app) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const items = await getRelated(app.alternatives ?? []);
  return NextResponse.json({ items });
}
