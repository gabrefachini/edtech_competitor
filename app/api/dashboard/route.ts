import { NextResponse } from "next/server";
import { buildDashboardSnapshot } from "../../../lib/runtimeData";

export async function GET() {
  try {
    const snapshot = await buildDashboardSnapshot();
    return NextResponse.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while loading dashboard.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
