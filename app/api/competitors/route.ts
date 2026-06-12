import { NextResponse } from "next/server";
import { applyFilters, loadCompetitors, saveCompetitors } from "../../../lib/competitors";
import { slugify } from "../../../lib/competitorConfig";
import type { CompetitorItem } from "../../../lib/types";
import { buildCompetitorHealthIndex } from "../../../lib/runtimeData";

function splitList(input: unknown) {
  if (Array.isArray(input)) return input.map((item) => String(item).trim()).filter(Boolean);
  if (typeof input !== "string") return [];
  return input
    .split(/[;,]/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const { competitors } = await loadCompetitors();
  const healthIndex = buildCompetitorHealthIndex();
  const merged = competitors.map((competitor) => {
    const health = healthIndex[competitor.id];
    const lastRun =
      health?.source_last_collected?.website ??
      health?.source_last_collected?.news ??
      health?.source_last_collected?.social ??
      health?.source_last_collected?.youtube ??
      health?.source_last_collected?.website ??
      null;
    const events7d =
      (health?.website_pages_collected_7d ?? 0) +
      (health?.social_events_7d ?? 0) +
      (health?.news_events_7d ?? 0) +
      (health?.youtube_events_7d ?? 0);
    return {
      ...competitor,
      ...(health ?? {}),
      last_run: lastRun,
      events_7d: events7d
    };
  });
  const filtered = applyFilters(merged, searchParams);
  return NextResponse.json({ competitors: filtered, total: filtered.length, health: healthIndex });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const website = String(body.website ?? "").trim();
  if (!name || !website) {
    return NextResponse.json({ error: "name and website are required" }, { status: 400 });
  }

  const { competitors } = await loadCompetitors();
  const nextCompetitor: CompetitorItem = {
    id: String(body.id ?? slugify(`${name}-${website}`)).trim() || slugify(name),
    name,
    website,
    scope: body.scope === "benchmark_global" ? "benchmark_global" : "competes_market",
    regions: splitList(body.regions).length ? splitList(body.regions) : ["BR"],
    markets: splitList(body.markets).length ? splitList(body.markets) : ["private"],
    tags: splitList(body.tags),
    status: body.status === "paused" ? "paused" : "active",
    last_run: null,
    events_7d: 0,
    impacted_products: splitList(body.impacted_products ?? body.products_impacted)
  };

  const saved = await saveCompetitors([
    nextCompetitor,
    ...competitors.filter((item) => item.id !== nextCompetitor.id)
  ]);
  const created = saved.find((item) => item.id === nextCompetitor.id) ?? nextCompetitor;
  return NextResponse.json({ competitor: created }, { status: 201 });
}
