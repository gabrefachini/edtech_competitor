import fs from "node:fs";
import path from "node:path";
import { format } from "date-fns";
import type { EventItem } from "../lib/types";
import type { CollectorStatus } from "./collectors/websiteCollector";
import type { PageSnapshot } from "./collectors/websiteCollector";
import { resolveProjectPath } from "../lib/projectPaths";

export type SourceHealth = {
  status: CollectorStatus;
  last_collected_at: string | null;
  website_pages_collected_7d?: number;
  social_events_7d?: number;
  news_events_7d?: number;
  youtube_events_7d?: number;
};

export type CompetitorHealth = {
  id: string;
  name: string;
  coverage_score: number;
  source_status: {
    website: CollectorStatus;
    news: CollectorStatus;
    social: CollectorStatus;
    youtube: CollectorStatus;
  };
  source_last_collected: {
    website: string | null;
    news: string | null;
    social: string | null;
    youtube: string | null;
  };
  website_pages_collected_7d: number;
  social_events_7d: number;
  news_events_7d: number;
  youtube_events_7d: number;
  evidence_urls: string[];
};

export type WeeklyHealthReport = {
  date: string;
  generated_at: string;
  competitors: CompetitorHealth[];
  summary: {
    average_coverage: number;
    ok_sources: number;
    blocked_sources: number;
    empty_sources: number;
    rate_limited_sources: number;
  };
};

function countBySource(events: EventItem[], competitorId: string, competitorName: string, sourceType: string) {
  return events.filter((event) => {
    const matchesCompetitor = event.competitor === competitorName || event.id.includes(competitorId);
    return matchesCompetitor && event.type.includes(sourceType);
  }).length;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function scoreCoverage(pages: number, social: number, news: number, youtube: number) {
  const websiteScore = Math.min(40, pages * 8);
  const socialScore = Math.min(20, social * 5);
  const newsScore = Math.min(20, news * 5);
  const youtubeScore = Math.min(20, youtube * 5);
  return clamp(websiteScore + socialScore + newsScore + youtubeScore);
}

export function buildCompetitorHealth(
  competitor: { id: string; name: string },
  events: EventItem[],
  snapshots: PageSnapshot[],
  sourceStatus: {
    website: CollectorStatus;
    news: CollectorStatus;
    social: CollectorStatus;
    youtube: CollectorStatus;
  },
  sourceLastCollected: {
    website: string | null;
    news: string | null;
    social: string | null;
    youtube: string | null;
  }
): CompetitorHealth {
  const websitePages = snapshots.filter((snapshot) => snapshot.competitor_id === competitor.id && snapshot.status !== "blocked").length;
  const socialEvents = countBySource(events, competitor.id, competitor.name, "social");
  const newsEvents = countBySource(events, competitor.id, competitor.name, "news");
  const youtubeEvents = countBySource(events, competitor.id, competitor.name, "youtube");
  const coverage_score = scoreCoverage(websitePages, socialEvents, newsEvents, youtubeEvents);
  const evidence_urls = [...new Set(events.filter((event) => event.competitor === competitor.name).map((event) => event.url))].slice(0, 8);

  return {
    id: competitor.id,
    name: competitor.name,
    coverage_score,
    source_status: sourceStatus,
    source_last_collected: sourceLastCollected,
    website_pages_collected_7d: websitePages,
    social_events_7d: socialEvents,
    news_events_7d: newsEvents,
    youtube_events_7d: youtubeEvents,
    evidence_urls
  };
}

export function summarizeHealth(competitors: CompetitorHealth[]) {
  const coverageValues = competitors.map((item) => item.coverage_score);
  const averageCoverage = coverageValues.length ? Math.round(coverageValues.reduce((sum, value) => sum + value, 0) / coverageValues.length) : 0;
  const sourceStatuses = competitors.flatMap((item) => Object.values(item.source_status));
  return {
    average_coverage: averageCoverage,
    ok_sources: sourceStatuses.filter((value) => value === "ok").length,
    blocked_sources: sourceStatuses.filter((value) => value === "blocked").length,
    empty_sources: sourceStatuses.filter((value) => value === "empty").length,
    rate_limited_sources: sourceStatuses.filter((value) => value === "rate_limited").length
  };
}

export function writeWeeklyHealthReport(report: WeeklyHealthReport) {
  const dir = resolveProjectPath("data", "health_reports");
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${report.date}.json`);
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2), "utf8");
  const latestPath = path.join(dir, "latest.json");
  fs.writeFileSync(latestPath, JSON.stringify(report, null, 2), "utf8");
  return filePath;
}

export function createHealthReport(
  date: Date,
  competitors: Array<{ id: string; name: string }>,
  events: EventItem[],
  snapshots: PageSnapshot[],
  sourceStatusByCompetitor: Record<string, WeeklyHealthReport["competitors"][number]["source_status"]>,
  sourceLastCollectedByCompetitor: Record<string, WeeklyHealthReport["competitors"][number]["source_last_collected"]>
): WeeklyHealthReport {
  const competitorHealth = competitors.map((competitor) =>
    buildCompetitorHealth(
      competitor,
      events,
      snapshots,
      sourceStatusByCompetitor[competitor.id] ?? { website: "empty", news: "empty", social: "empty", youtube: "empty" },
      sourceLastCollectedByCompetitor[competitor.id] ?? { website: null, news: null, social: null, youtube: null }
    )
  );

  return {
    date: format(date, "yyyy-MM-dd"),
    generated_at: date.toISOString(),
    competitors: competitorHealth,
    summary: summarizeHealth(competitorHealth)
  };
}
