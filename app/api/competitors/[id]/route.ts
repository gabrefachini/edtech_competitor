import { NextResponse } from "next/server";
import { getCompetitorById, toggleCompetitorStatus } from "../../../../lib/competitors";
import { buildCompetitorHealthIndex } from "../../../../lib/runtimeData";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const competitor = await getCompetitorById(id);
  if (!competitor) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const health = buildCompetitorHealthIndex()[competitor.id];
  const lastRun =
    health?.source_last_collected?.website ??
    health?.source_last_collected?.news ??
    health?.source_last_collected?.social ??
    health?.source_last_collected?.youtube ??
    null;
  const events7d =
    (health?.website_pages_collected_7d ?? 0) +
    (health?.social_events_7d ?? 0) +
    (health?.news_events_7d ?? 0) +
    (health?.youtube_events_7d ?? 0);
  return NextResponse.json({
    competitor: {
      ...competitor,
      ...(health ?? {}),
      last_run: lastRun,
      events_7d: events7d
    }
  });
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
