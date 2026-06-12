import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { loadConfig } from "../../../../../src/loadConfig";
import { getCompetitorById } from "../../../../../lib/competitors";
import { buildCompetitorHealthIndex } from "../../../../../lib/runtimeData";
import { runCompetitorCollection, readCollectedState, writeCollectedState } from "../../../../../src/collectionRunner";
import { buildHealthReportFromData } from "../../../../../src/weeklyHealth";
import { resolveProjectPath } from "../../../../../lib/projectPaths";

const dataDir = resolveProjectPath("data");
const eventsPath = path.join(dataDir, "events.jsonl");
const snapshotsPath = path.join(dataDir, "page_snapshots.jsonl");

function appendJsonLine(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, `${JSON.stringify(value)}\n`);
}

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const competitor = await getCompetitorById(id);
  if (!competitor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { competitors, products } = loadConfig();
  const statePath = resolveProjectPath("data", "state.json");
  const state = readCollectedState(statePath);
  const currentConfig = competitors.find((item) => item.id === competitor.id);
  if (!currentConfig) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = await runCompetitorCollection(competitor, products, state.hashes);
  result.snapshots.forEach((snapshot) => appendJsonLine(snapshotsPath, snapshot));
  result.events.forEach((event) => appendJsonLine(eventsPath, event));
  writeCollectedState(statePath, { ...state.hashes, ...Object.fromEntries(result.snapshots.map((snapshot) => [snapshot.url, snapshot.hash])) });
  await buildHealthReportFromData();

  const healthIndex = buildCompetitorHealthIndex();
  const health = healthIndex[competitor.id];
  return NextResponse.json({
    competitor: {
      ...competitor,
      ...(health ?? {}),
      last_run: health?.source_last_collected?.website ?? health?.source_last_collected?.news ?? health?.source_last_collected?.social ?? health?.source_last_collected?.youtube ?? new Date().toISOString(),
      events_7d:
        (health?.website_pages_collected_7d ?? 0) +
        (health?.social_events_7d ?? 0) +
        (health?.news_events_7d ?? 0) +
        (health?.youtube_events_7d ?? 0)
    }
  }, { status: 200 });
}
