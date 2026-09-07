import { NextResponse } from "next/server";
import { getDeveloper } from "@/lib/api/catalog";

export async function GET(_: Request, { params }: { params: { slug: string } }) {
  const data = await getDeveloper(params.slug);
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(data);
}
