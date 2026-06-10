import { NextResponse } from "next/server";
import { applyFilters, loadCompetitors } from "../../../lib/competitors";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const { competitors } = await loadCompetitors();
  const filtered = applyFilters(competitors, searchParams);
  return NextResponse.json({ competitors: filtered, total: filtered.length });
}
