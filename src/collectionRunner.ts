import fs from "node:fs";
import path from "node:path";
import type { EventItem } from "../lib/types";
import type { Product } from "./loadConfig";
import type { CompetitorItem } from "../lib/types";
import { collectNewsSignals } from "./collectors/newsCollector";
import { collectSocialSignals } from "./collectors/socialCollector";
import { collectWebsiteSignals, type PageSnapshot, type CollectorStatus } from "./collectors/websiteCollector";
import { collectYouTubeSignals } from "./collectors/youtubeCollector";
import { createHealthReport, writeWeeklyHealthReport } from "./healthReport";
import { format } from "date-fns";
import { resolveProjectPath } from "../lib/projectPaths";

const dataDir = resolveProjectPath("data");
const eventsPath = path.join(dataDir, "events.jsonl");
const snapshotsPath = path.join(dataDir, "page_snapshots.jsonl");
const logsDir = path.join(dataDir, "logs");

function ensureDirs() {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(logsDir, { recursive: true });
}

function appendJsonLine(filePath: string, value: unknown) {
  fs.appendFileSync(filePath, `${JSON.stringify(value)}\n`);
}

export type CompetitorCollectionResult = {
  competitor: CompetitorItem;
  events: EventItem[];
  snapshots: PageSnapshot[];
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
  metrics: {
    website_pages_collected_7d: number;
    social_events_7d: number;
    news_events_7d: number;
    youtube_events_7d: number;
    coverage_score: number;
  };
  errors: string[];
};

export type WeeklyCollectionResult = {
  date: string;
  events: EventItem[];
  snapshots: PageSnapshot[];
  competitorResults: CompetitorCollectionResult[];
};

export async function runCompetitorCollection(
  competitor: CompetitorItem,
  products: Product[],
  stateHashes: Record<string, string>,
  collectedAt = new Date().toISOString()
): Promise<CompetitorCollectionResult> {
  const events: EventItem[] = [];
  const snapshots: PageSnapshot[] = [];
  const errors: string[] = [];

  const website = await collectWebsiteSignals(competitor, products, stateHashes, collectedAt);
  const news = await collectNewsSignals(competitor, products, collectedAt);
  const social = await collectSocialSignals(competitor, products, collectedAt);
  const youtube = await collectYouTubeSignals(competitor, products, collectedAt);

  snapshots.push(...website.snapshots);
  events.push(...website.events, ...news.events, ...social.events, ...youtube.events);
  errors.push(...website.errors, ...news.errors, ...social.errors, ...youtube.errors);

  return {
    competitor,
    events,
    snapshots,
    source_status: {
      website: website.source_status,
      news: news.status,
      social: social.status,
      youtube: youtube.status
    },
    source_last_collected: {
      website: website.last_collected_at,
      news: news.last_collected_at,
      social: social.last_collected_at,
      youtube: youtube.last_collected_at
    },
    metrics: {
      website_pages_collected_7d: website.pages_collected_7d,
      social_events_7d: social.items_found,
      news_events_7d: news.items_found,
      youtube_events_7d: youtube.items_found,
      coverage_score: 0
    },
    errors
  };
}

export async function runWeeklyCollection(competitors: CompetitorItem[], products: Product[], stateHashes: Record<string, string>) {
  ensureDirs();
  const collectedAt = new Date().toISOString();
  const collectedDate = collectedAt.slice(0, 10);
  const allEvents: EventItem[] = [];
  const allSnapshots: PageSnapshot[] = [];
  const competitorResults: CompetitorCollectionResult[] = [];
  const nextHashes = { ...stateHashes };

  for (const competitor of competitors) {
    try {
      const result = await runCompetitorCollection(competitor, products, nextHashes, collectedAt);
      result.snapshots.forEach((snapshot) => {
        if (snapshot.status !== "blocked") {
          nextHashes[snapshot.url] = snapshot.hash;
        }
        appendJsonLine(snapshotsPath, snapshot);
      });
      result.events.forEach((event) => appendJsonLine(eventsPath, event));
      allEvents.push(...result.events);
      allSnapshots.push(...result.snapshots);
      competitorResults.push(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown_error";
      competitorResults.push({
        competitor,
        events: [],
        snapshots: [],
        source_status: { website: "http_error", news: "empty", social: "empty", youtube: "empty" },
        source_last_collected: { website: null, news: null, social: null, youtube: null },
        metrics: {
          website_pages_collected_7d: 0,
          social_events_7d: 0,
          news_events_7d: 0,
          youtube_events_7d: 0,
          coverage_score: 0
        },
        errors: [message]
      });
    }
  }

  const health = createHealthReport(
    new Date(collectedAt),
    competitors,
    allEvents,
    allSnapshots,
    Object.fromEntries(competitorResults.map((result) => [result.competitor.id, result.source_status])),
    Object.fromEntries(competitorResults.map((result) => [result.competitor.id, result.source_last_collected]))
  );
  writeWeeklyHealthReport(health);

  return {
    date: collectedDate,
    events: allEvents,
    snapshots: allSnapshots,
    competitorResults,
    health,
    nextHashes
  };
}

export function writeCollectedState(statePath: string, hashes: Record<string, string>, lastRun = new Date().toISOString()) {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify({ last_run: lastRun, hashes }, null, 2), "utf8");
}

export function readCollectedState(statePath: string) {
  if (!fs.existsSync(statePath)) return { last_run: undefined, hashes: {} as Record<string, string> };
  const raw = fs.readFileSync(statePath, "utf8");
  const parsed = JSON.parse(raw) as { last_run?: string; hashes?: Record<string, string> };
  return { last_run: parsed.last_run, hashes: parsed.hashes ?? {} };
}
