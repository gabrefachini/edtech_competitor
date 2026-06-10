import { NextResponse } from "next/server";
import { getCompetitorById, toggleCompetitorStatus } from "../../../../lib/competitors";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const competitor = await getCompetitorById(id);
  if (!competitor) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ competitor });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const status = body.status === "active" || body.status === "paused" ? body.status : null;
  const current = await getCompetitorById(id);
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const updated = status && current.status !== status ? await toggleCompetitorStatus(id) : current;
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ competitor: updated });
}
