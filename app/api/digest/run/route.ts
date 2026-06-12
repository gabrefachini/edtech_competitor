import { NextResponse } from "next/server";
import { runWeeklyDigestJob } from "../../../../src/runWeeklyDigest";

export async function POST() {
  try {
    const result = await runWeeklyDigestJob({ skipCollection: true });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while generating digest.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
