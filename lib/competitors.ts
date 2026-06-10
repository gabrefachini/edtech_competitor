import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import yaml from "js-yaml";

export type CompetitorStatus = "active" | "paused";
export type CompetitorScope = "competes_market" | "benchmark_global";
export type CompetitorRegion = "BR" | "LATAM" | "GLOBAL";
export type CompetitorMarket = "public" | "private";

export type CompetitorRecord = {
  id: string;
  name: string;
  website: string;
  scope: CompetitorScope;
  regions: CompetitorRegion[];
  markets: CompetitorMarket[];
  tags: string[];
  status: CompetitorStatus;
  last_run: string | null;
  events_7d: number;
  impacted_products: string[];
};

type RawCompetitor = Partial<CompetitorRecord> & {
  socials?: Record<string, unknown>;
  markets?: string[] | string;
  regions?: string[] | string;
  tags?: string[] | string;
  impacted_products?: string[] | string;
  products_impacted?: string[] | string;
  status?: string;
  scope?: string;
  id?: string;
  website?: string;
  name?: string;
  last_run?: string | null;
  events_7d?: number | string;
};

type CompetitorFile = {
  version?: string;
  notes?: string[];
  competitors: RawCompetitor[];
};

const ROOT = process.cwd();
export const COMPETITOR_YAML_PATH = fsPath("config/competitors.yaml");
const EVENTS_PATH = fsPath("data/events.jsonl");

function fsPath(...segments: string[]) {
  return path.join(ROOT, ...segments);
}

function splitList(input?: string[] | string): string[] {
  if (Array.isArray(input)) return input.flatMap((item) => splitList(item));
  if (typeof input !== "string") return [];
  return input
    .split(/[;,]/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function dedupe<T>(items: T[]) {
  return [...new Set(items)];
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeMarket(value: string): CompetitorMarket | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (["publix", "public", "público", "publico"].includes(normalized)) return "public";
  if (["private", "privado"].includes(normalized)) return "private";
  return null;
}

export function normalizeRegion(value: string): CompetitorRegion | null {
  const normalized = value.trim().toUpperCase();
  if (normalized === "BR" || normalized === "LATAM" || normalized === "GLOBAL") return normalized;
  return null;
}

export function normalizeCompetitor(raw: RawCompetitor, fallbackIndex = 0): CompetitorRecord {
  const name = String(raw.name ?? "").trim();
  const website = String(raw.website ?? "").trim();
  const id = String(raw.id ?? slugify(name || website || `competitor-${fallbackIndex}`)).trim();
  const scope = raw.scope === "benchmark_global" ? "benchmark_global" : "competes_market";
  const regions = dedupe(
    splitList(raw.regions)
      .map(normalizeRegion)
      .filter((item): item is CompetitorRegion => Boolean(item))
  );
  const markets = dedupe(
    splitList(raw.markets)
      .map(normalizeMarket)
      .filter((item): item is CompetitorMarket => Boolean(item))
  );
  const tags = dedupe(splitList(raw.tags).map((item) => item.trim()).filter(Boolean));
  const impactedProducts = dedupe(splitList(raw.impacted_products ?? raw.products_impacted).map((item) => item.trim()).filter(Boolean));
  const status: CompetitorStatus = raw.status === "paused" ? "paused" : "active";
  const last_run = raw.last_run ? new Date(raw.last_run).toISOString() : null;
  const events_7d = Number(raw.events_7d ?? 0) || 0;

  return {
    id,
    name,
    website,
    scope,
    regions: regions.length ? regions : ["BR"],
    markets: markets.length ? markets : ["private"],
    tags,
    status,
    last_run,
    events_7d,
    impacted_products: impactedProducts
  };
}

export function normalizeCompetitors(raw: RawCompetitor[]) {
  return raw.map((item, index) => normalizeCompetitor(item, index));
}

async function readCompetitorFile(filePath = COMPETITOR_YAML_PATH) {
  const raw = await fs.readFile(filePath, "utf8");
  return yaml.load(raw) as CompetitorFile;
}

async function writeCompetitorFile(file: CompetitorFile, filePath = COMPETITOR_YAML_PATH) {
  const tempPath = `${filePath}.tmp`;
  const yamlString = yaml.dump(file, { lineWidth: 120, noRefs: true, sortKeys: false });
  await fs.writeFile(tempPath, yamlString, "utf8");
  await fs.rename(tempPath, filePath);
}

export async function loadCompetitors(filePath = COMPETITOR_YAML_PATH) {
  const file = await readCompetitorFile(filePath);
  const competitors = normalizeCompetitors(file.competitors ?? []);
  return { file, competitors };
}

export async function getCompetitorById(id: string, filePath = COMPETITOR_YAML_PATH) {
  const { competitors } = await loadCompetitors(filePath);
  return competitors.find((item) => item.id === id) ?? null;
}

export function applyFilters(competitors: CompetitorRecord[], query: URLSearchParams) {
  const region = query.get("region")?.trim().toUpperCase();
  const market = query.get("market")?.trim().toLowerCase();
  const scope = query.get("scope")?.trim();
  const tag = query.get("tag")?.trim().toLowerCase();
  const status = query.get("status")?.trim().toLowerCase();

  return competitors.filter((item) => {
    if (region && !item.regions.includes(region as CompetitorRegion)) return false;
    if (market && !item.markets.includes(normalizeMarket(market) ?? "private")) return false;
    if (scope && item.scope !== scope) return false;
    if (tag && !item.tags.some((entry) => entry.toLowerCase().includes(tag))) return false;
    if (status && item.status !== status) return false;
    return true;
  });
}

export async function saveCompetitors(competitors: CompetitorRecord[], filePath = COMPETITOR_YAML_PATH) {
  const file = await readCompetitorFile(filePath);
  const normalized = normalizeCompetitors(competitors);
  const nextFile: CompetitorFile = {
    ...file,
    competitors: normalized
  };
  await writeCompetitorFile(nextFile, filePath);
  return normalized;
}

export async function updateCompetitorById(id: string, updater: (competitor: CompetitorRecord) => CompetitorRecord | Promise<CompetitorRecord>, filePath = COMPETITOR_YAML_PATH) {
  const { competitors, file } = await loadCompetitors(filePath);
  const current = competitors.find((item) => item.id === id);
  if (!current) return null;
  const updated = await updater(current);
  const next = competitors.map((item) => (item.id === id ? updated : item));
  const nextFile: CompetitorFile = { ...file, competitors: next };
  await writeCompetitorFile(nextFile, filePath);
  return updated;
}

export async function toggleCompetitorStatus(id: string, filePath = COMPETITOR_YAML_PATH) {
  return updateCompetitorById(id, async (competitor) => ({
    ...competitor,
    status: competitor.status === "active" ? "paused" : "active"
  }), filePath);
}

export async function runCompetitorNow(id: string, filePath = COMPETITOR_YAML_PATH) {
  const now = new Date().toISOString();
  return updateCompetitorById(id, async (competitor) => {
    const nextEvents = competitor.events_7d + 1;
    return {
      ...competitor,
      last_run: now,
      events_7d: nextEvents
    };
  }, filePath);
}

export function buildCompetitorRouteId(id: string) {
  return slugify(id);
}

export function seedCompetitorId(name: string, website: string) {
  return crypto.createHash("sha1").update(`${name}|${website}`).digest("hex").slice(0, 12);
}

export async function readCurrentCompetitorsText() {
  return fs.readFile(COMPETITOR_YAML_PATH, "utf8");
}

export async function readEventsHistory() {
  try {
    const raw = await fs.readFile(EVENTS_PATH, "utf8");
    return raw.split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

export async function appendEventHistory(line: string) {
  await fs.appendFile(EVENTS_PATH, `${line}\n`);
}
