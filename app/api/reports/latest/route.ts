import { NextResponse } from "next/server";
import { buildDashboardSnapshot, readLatestWeeklyExport } from "../../../../lib/runtimeData";

export async function GET() {
  try {
    const snapshot = await buildDashboardSnapshot();
    const report = await readLatestWeeklyExport();
    return NextResponse.json({
      report,
      metrics: snapshot.metrics,
      health: snapshot.health,
      events: snapshot.events
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while loading reports.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
