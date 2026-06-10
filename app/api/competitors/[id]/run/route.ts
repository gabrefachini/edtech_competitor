import { NextResponse } from "next/server";
import { getCompetitorById, runCompetitorNow } from "../../../../../lib/competitors";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const competitor = await getCompetitorById(id);
  if (!competitor) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const updated = await runCompetitorNow(id);
  return NextResponse.json({ competitor: updated }, { status: 200 });
}
