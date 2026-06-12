import fs from "node:fs";
import path from "node:path";
import { attachEvidenceToMetrics, computeExecutiveMetrics } from "./reportMetrics";
import { loadCompetitors, mergeCompetitorsWithHealth } from "./competitors";
import type { CompetitorItem, EventItem } from "./types";
import { generateEmailHtml, generateEmailMarkdown } from "../src/generateEmail";
import { resolveProjectPath } from "./projectPaths";

const DATA_DIR = resolveProjectPath("data");
const EVENTS_PATH = path.join(DATA_DIR, "events.jsonl");
const SNAPSHOTS_PATH = path.join(DATA_DIR, "page_snapshots.jsonl");
const HEALTH_DIR = path.join(DATA_DIR, "health_reports");
const EXPORTS_DIR = resolveProjectPath("exports", "weekly");

export function readJsonLines<T>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

export function readEvents(): EventItem[] {
  return readJsonLines<EventItem>(EVENTS_PATH);
}

export function readPageSnapshots() {
  return readJsonLines<{
    competitor_id: string;
    competitor_name: string;
    url: string;
    title: string;
    cleaned_text: string;
    hash: string;
    collected_at: string;
    status: string;
  }>(SNAPSHOTS_PATH);
}

function newestFile(directory: string, extension: string) {
  if (!fs.existsSync(directory)) return null;
  const files = fs
    .readdirSync(directory)
    .filter((name) => name.endsWith(extension))
    .sort((a, b) => b.localeCompare(a));
  return files.length ? path.join(directory, files[0]) : null;
}

export function readLatestHealthReport() {
  const latestPath = path.join(HEALTH_DIR, "latest.json");
  const reportPath = fs.existsSync(latestPath) ? latestPath : newestFile(HEALTH_DIR, ".json");
  if (!reportPath) return null;
  return JSON.parse(fs.readFileSync(reportPath, "utf8")) as {
    date: string;
    generated_at: string;
    competitors: Array<{
      id: string;
      name: string;
      coverage_score: number;
      source_status: Record<string, string>;
      source_last_collected: Record<string, string | null>;
      website_pages_collected_7d: number;
      social_events_7d: number;
      news_events_7d: number;
      youtube_events_7d: number;
      evidence_urls: string[];
    }>;
    summary: {
      average_coverage: number;
      ok_sources: number;
      blocked_sources: number;
      empty_sources: number;
      rate_limited_sources: number;
    };
  };
}

export async function readLatestWeeklyExport() {
  const mdPath = newestFile(EXPORTS_DIR, ".md");
  const htmlPath = mdPath ? mdPath.replace(/\.md$/, ".html") : null;
  if (mdPath && htmlPath && fs.existsSync(htmlPath)) {
    const date = path.basename(mdPath, ".md");
    return {
      date,
      title: `Resumo Semanal - ${date}`,
      markdown: fs.readFileSync(mdPath, "utf8"),
      html: fs.readFileSync(htmlPath, "utf8")
    };
  }

  const { competitors } = await loadCompetitors();
  const events = readEvents();
  const date = new Date().toISOString().slice(0, 10);
  const markdown = generateEmailMarkdown(new Date(), events, [], competitors as any);
  const html = generateEmailHtml(markdown);
  return {
    date,
    title: `Resumo Semanal - ${date}`,
    markdown,
    html
  };
}

export function buildCompetitorHealthIndex() {
  const report = readLatestHealthReport();
  return Object.fromEntries((report?.competitors ?? []).map((item) => [item.id, item]));
}

export async function buildCompetitorsWithHealth() {
  const { competitors } = await loadCompetitors();
  const healthIndex = buildCompetitorHealthIndex();
  return mergeCompetitorsWithHealth(competitors as CompetitorItem[], healthIndex).map((competitor) => {
    const health = healthIndex[competitor.id];
    const lastRun = health?.source_last_collected?.website ?? health?.source_last_collected?.news ?? health?.source_last_collected?.social ?? health?.source_last_collected?.youtube ?? null;
    const events7d =
      (health?.website_pages_collected_7d ?? 0) +
      (health?.social_events_7d ?? 0) +
      (health?.news_events_7d ?? 0) +
      (health?.youtube_events_7d ?? 0);
    return {
      ...competitor,
      last_run: lastRun,
      events_7d: events7d
    };
  });
}

export async function buildDashboardSnapshot() {
  const events = readEvents();
  const snapshots = readPageSnapshots();
  const competitors = await buildCompetitorsWithHealth();
  const health = readLatestHealthReport();
  const metrics = attachEvidenceToMetrics(computeExecutiveMetrics(events, events.slice(0, 25), competitors), events);
  const report = await readLatestWeeklyExport();
  return {
    metrics,
    events: events.slice(0, 10),
    snapshots,
    competitors,
    health,
    report
  };
}

export function getLatestWeeklyExportPath() {
  return newestFile(EXPORTS_DIR, ".md");
}
