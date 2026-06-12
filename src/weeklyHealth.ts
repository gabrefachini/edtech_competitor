import { loadConfig } from "./loadConfig";
import { readEvents, readPageSnapshots, buildCompetitorHealthIndex } from "../lib/runtimeData";
import { createHealthReport, writeWeeklyHealthReport } from "./healthReport";
import type { WeeklyHealthReport } from "./healthReport";

export async function buildHealthReportFromData() {
  const events = readEvents();
  const snapshots = readPageSnapshots();
  const { competitors } = loadConfig();
  const healthIndex = buildCompetitorHealthIndex();
  const sourceStatusByCompetitor = Object.fromEntries(
    competitors.map((competitor) => [
      competitor.id,
      healthIndex[competitor.id]?.source_status ?? { website: "empty", news: "empty", social: "empty", youtube: "empty" }
    ])
  ) as Record<string, WeeklyHealthReport["competitors"][number]["source_status"]>;
  const sourceLastCollectedByCompetitor = Object.fromEntries(
    competitors.map((competitor) => [
      competitor.id,
      healthIndex[competitor.id]?.source_last_collected ?? { website: null, news: null, social: null, youtube: null }
    ])
  ) as Record<string, WeeklyHealthReport["competitors"][number]["source_last_collected"]>;
  const report = createHealthReport(new Date(), competitors as any, events, snapshots as any, sourceStatusByCompetitor, sourceLastCollectedByCompetitor);
  writeWeeklyHealthReport(report);
  return report;
}
