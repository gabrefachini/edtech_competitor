import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import yaml from "js-yaml";
import {
  createDeterministicId,
  normalizeCompetitorConfig,
  normalizeCompetitorConfigs,
  normalizeMarket,
  slugify,
  type NormalizedCompetitorConfig,
  type RawCompetitorConfig
} from "./competitorConfig";
import type { CompetitorItem } from "./types";
import { resolveProjectPath } from "./projectPaths";

export const COMPETITOR_YAML_PATH = fsPath("config/competitors.yaml");
const EVENTS_PATH = fsPath("data/events.jsonl");

function fsPath(...segments: string[]) {
  return resolveProjectPath(...segments);
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

async function readCompetitorFile(filePath = COMPETITOR_YAML_PATH) {
  const raw = await fs.readFile(filePath, "utf8");
  return yaml.load(raw) as { version?: string; notes?: string[]; competitors: RawCompetitorConfig[] };
}

async function writeCompetitorFile(file: { version?: string; notes?: string[]; competitors: RawCompetitorConfig[] }, filePath = COMPETITOR_YAML_PATH) {
  const tempPath = `${filePath}.tmp`;
  const yamlString = yaml.dump(file, { lineWidth: 120, noRefs: true, sortKeys: false });
  await fs.writeFile(tempPath, yamlString, "utf8");
  await fs.rename(tempPath, filePath);
}

export function normalizeCompetitor(raw: RawCompetitorConfig, fallbackIndex = 0): NormalizedCompetitorConfig {
  return normalizeCompetitorConfig(raw, fallbackIndex);
}

export function normalizeCompetitors(raw: RawCompetitorConfig[]) {
  return normalizeCompetitorConfigs(raw);
}

export async function loadCompetitors(filePath = COMPETITOR_YAML_PATH) {
  const file = await readCompetitorFile(filePath);
  const competitors = normalizeCompetitors(file.competitors ?? []).map((competitor) => ({
    id: competitor.id,
    name: competitor.name,
    website: competitor.website,
    scope: competitor.scope,
    regions: competitor.regions,
    markets: competitor.markets,
    tags: competitor.tags,
    status: competitor.status,
    last_run: null,
    events_7d: 0,
    impacted_products: competitor.products_impacted,
    sources: competitor.sources
  }));
  return { file, competitors };
}

export async function getCompetitorById(id: string, filePath = COMPETITOR_YAML_PATH) {
  const { competitors } = await loadCompetitors(filePath);
  return competitors.find((item) => item.id === id) ?? null;
}

export function applyFilters(competitors: CompetitorItem[], query: URLSearchParams) {
  const region = query.get("region")?.trim().toUpperCase();
  const market = query.get("market")?.trim().toLowerCase();
  const scope = query.get("scope")?.trim();
  const tag = query.get("tag")?.trim().toLowerCase();
  const status = query.get("status")?.trim().toLowerCase();

  return competitors.filter((item) => {
    if (region && !item.regions.includes(region as any)) return false;
    if (market && !item.markets.includes(normalizeMarket(market) ?? "private")) return false;
    if (scope && item.scope !== scope) return false;
    if (tag && !item.tags.some((entry) => entry.toLowerCase().includes(tag))) return false;
    if (status && item.status !== status) return false;
    return true;
  });
}

export async function saveCompetitors(competitors: CompetitorItem[], filePath = COMPETITOR_YAML_PATH) {
  const file = await readCompetitorFile(filePath);
  const normalized = competitors.map((item, index) => normalizeCompetitor({
    id: item.id,
    name: item.name,
    website: item.website,
    scope: item.scope,
    regions: item.regions,
    markets: item.markets,
    tags: item.tags,
    status: item.status,
    products_impacted: item.impacted_products
  }, index));
  const nextFile = {
    ...file,
    competitors: normalized.map((item) => ({
      id: item.id,
      name: item.name,
      website: item.website,
      scope: item.scope,
      regions: item.regions,
      markets: item.markets,
      tags: item.tags,
      status: item.status,
      products_impacted: item.products_impacted,
      sources: item.sources
    }))
  };
  await writeCompetitorFile(nextFile, filePath);
  return normalized.map((item) => ({
    id: item.id,
    name: item.name,
    website: item.website,
    scope: item.scope,
    regions: item.regions,
    markets: item.markets,
    tags: item.tags,
    status: item.status,
    last_run: null,
    events_7d: 0,
    impacted_products: item.products_impacted,
    sources: item.sources
  }));
}

export async function updateCompetitorById(
  id: string,
  updater: (competitor: CompetitorItem) => CompetitorItem | Promise<CompetitorItem>,
  filePath = COMPETITOR_YAML_PATH
) {
  const { competitors, file } = await loadCompetitors(filePath);
  const current = competitors.find((item) => item.id === id);
  if (!current) return null;
  const currentItem: CompetitorItem = {
    id: current.id,
    name: current.name,
    website: current.website,
    scope: current.scope,
    regions: current.regions,
    markets: current.markets,
    tags: current.tags,
    status: current.status,
    last_run: null,
    events_7d: 0,
    impacted_products: current.impacted_products,
    sources: current.sources
  };
  const updated = await updater(currentItem);
  const next = competitors.map((item) =>
    item.id === id
      ? {
          ...item,
          name: updated.name,
          website: updated.website,
          scope: updated.scope,
          regions: updated.regions,
          markets: updated.markets,
          tags: updated.tags,
          status: updated.status,
          products_impacted: updated.impacted_products
        }
      : item
  );
  const nextFile = {
    ...file,
    competitors: next.map((item) => ({
      id: item.id,
      name: item.name,
      website: item.website,
      scope: item.scope,
      regions: item.regions,
      markets: item.markets,
      tags: item.tags,
      status: item.status,
      products_impacted: item.impacted_products,
      sources: item.sources
    }))
  };
  await writeCompetitorFile(nextFile, filePath);
  return updated;
}

export async function toggleCompetitorStatus(id: string, filePath = COMPETITOR_YAML_PATH) {
  return updateCompetitorById(
    id,
    async (competitor) => ({
      ...competitor,
      status: competitor.status === "active" ? "paused" : "active"
    }),
    filePath
  );
}

export async function runCompetitorNow(id: string, filePath = COMPETITOR_YAML_PATH) {
  const now = new Date().toISOString();
  return updateCompetitorById(
    id,
    async (competitor) => ({
      ...competitor,
      last_run: now,
      events_7d: competitor.events_7d + 1
    }),
    filePath
  );
}

export function buildCompetitorRouteId(id: string) {
  return slugify(id);
}

export function seedCompetitorId(name: string, website: string) {
  return createDeterministicId(name, website);
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

export function mergeCompetitorsWithHealth(
  competitors: CompetitorItem[],
  healthById: Record<string, {
    coverage_score?: number;
    source_status?: CompetitorItem["source_status"];
    source_last_collected?: CompetitorItem["source_last_collected"];
  }>
) {
  return competitors.map((competitor) => ({
    ...competitor,
    ...(healthById[competitor.id] ?? {})
  }));
}
