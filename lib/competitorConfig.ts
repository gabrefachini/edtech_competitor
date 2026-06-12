import crypto from "node:crypto";
import yaml from "js-yaml";

export type CompetitorScope = "competes_market" | "benchmark_global";
export type CompetitorRegion = "BR" | "LATAM" | "GLOBAL";
export type CompetitorMarket = "public" | "private";
export type CompetitorStatus = "active" | "paused";

export type SourceEntry = {
  url?: string;
  query?: string;
  channel_url?: string;
};

export type CompetitorSources = {
  website: Array<{ url: string }>;
  news: Array<{ query: string }>;
  social: {
    linkedin: SourceEntry[];
    x: SourceEntry[];
    instagram: SourceEntry[];
  };
  youtube: SourceEntry[];
};

export type RawCompetitorConfig = {
  id?: string;
  name?: string;
  website?: string;
  scope?: string;
  regions?: string[] | string;
  markets?: string[] | string;
  tags?: string[] | string;
  status?: string;
  products_impacted?: string[] | string;
  impacted_products?: string[] | string;
  sources?: Partial<CompetitorSources>;
  socials?: Record<string, string | undefined>;
};

export type NormalizedCompetitorConfig = {
  id: string;
  name: string;
  website: string;
  scope: CompetitorScope;
  regions: CompetitorRegion[];
  markets: CompetitorMarket[];
  tags: string[];
  status: CompetitorStatus;
  products_impacted: string[];
  sources: CompetitorSources;
};

export type CompetitorFile = {
  version?: string;
  notes?: string[];
  competitors: RawCompetitorConfig[];
};

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

function normalizeSourceEntry(entry: SourceEntry | string | undefined, defaults: Partial<SourceEntry> = {}): SourceEntry | null {
  if (!entry && !defaults.url && !defaults.query && !defaults.channel_url) return null;
  if (typeof entry === "string") {
    const value = entry.trim();
    if (!value) return null;
    if (/^https?:\/\//i.test(value)) return { ...defaults, url: value };
    return { ...defaults, query: value };
  }
  const url = entry?.url?.trim() || defaults.url?.trim();
  const query = entry?.query?.trim() || defaults.query?.trim();
  const channelUrl = entry?.channel_url?.trim() || defaults.channel_url?.trim();
  const normalized: SourceEntry = {};
  if (url) normalized.url = url;
  if (query) normalized.query = query;
  if (channelUrl) normalized.channel_url = channelUrl;
  return Object.keys(normalized).length ? normalized : null;
}

function normalizeSourceList(input: Array<SourceEntry | string> | undefined, fallback: Array<SourceEntry | string>) {
  const items = [...(input ?? []), ...fallback]
    .map((item) => normalizeSourceEntry(item))
    .filter(Boolean) as SourceEntry[];
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = JSON.stringify(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function defaultQueries(name: string) {
  return {
    news: [{ query: `${name} news launch partnership pricing` }],
    linkedin: [{ query: `site:linkedin.com/company ${name} announcement feature partnership` }],
    x: [{ query: `site:x.com ${name} launch update pricing` }],
    instagram: [{ query: `site:instagram.com ${name} lançamento novidade update` }],
    youtube: [{ query: `${name} youtube` }]
  };
}

function normalizeSocialBlock(
  raw: Partial<CompetitorSources["social"]> | undefined,
  socials: Record<string, string | undefined> | undefined,
  name: string
) {
  const defaults = defaultQueries(name);
  const linkedinFallback = socials?.linkedin ? [{ url: socials.linkedin }] : defaults.linkedin;
  const xFallback = socials?.x ? [{ url: socials.x }] : defaults.x;
  const instagramFallback = socials?.instagram ? [{ url: socials.instagram }] : defaults.instagram;
  return {
    linkedin: normalizeSourceList(raw?.linkedin as Array<SourceEntry | string> | undefined, linkedinFallback),
    x: normalizeSourceList(raw?.x as Array<SourceEntry | string> | undefined, xFallback),
    instagram: normalizeSourceList(raw?.instagram as Array<SourceEntry | string> | undefined, instagramFallback)
  };
}

function normalizeYoutubeBlock(raw: Array<SourceEntry | string> | undefined, name: string, socials: Record<string, string | undefined> | undefined) {
  const defaults = defaultQueries(name).youtube;
  const explicit = socials?.youtube ? [{ url: socials.youtube }] : [];
  return normalizeSourceList(raw, [...explicit, ...defaults]);
}

export function normalizeCompetitorConfig(raw: RawCompetitorConfig, fallbackIndex = 0): NormalizedCompetitorConfig {
  const name = String(raw.name ?? "").trim();
  const website = String(raw.website ?? "").trim();
  const id = String(raw.id ?? slugify(name || website || `competitor-${fallbackIndex}`)).trim();
  const scope: CompetitorScope = raw.scope === "benchmark_global" ? "benchmark_global" : "competes_market";
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
  const productsImpacted = dedupe(splitList(raw.products_impacted ?? raw.impacted_products).map((item) => item.trim()).filter(Boolean));
  const status: CompetitorStatus = raw.status === "paused" ? "paused" : "active";
  const websiteSources = normalizeSourceList(raw.sources?.website as Array<SourceEntry | string> | undefined, website ? [{ url: website }] : [])
    .map((item) => (item.url ? { url: item.url } : null))
    .filter((item): item is { url: string } => Boolean(item));
  const newsSources = normalizeSourceList(raw.sources?.news as Array<SourceEntry | string> | undefined, defaultQueries(name).news)
    .map((item) => (item.query ? { query: item.query } : null))
    .filter((item): item is { query: string } => Boolean(item));
  const sources: CompetitorSources = {
    website: websiteSources,
    news: newsSources,
    social: normalizeSocialBlock(raw.sources?.social, raw.socials, name),
    youtube: normalizeYoutubeBlock(raw.sources?.youtube as Array<SourceEntry | string> | undefined, name, raw.socials)
  };

  return {
    id,
    name,
    website,
    scope,
    regions: regions.length ? regions : ["BR"],
    markets: markets.length ? markets : ["private"],
    tags,
    status,
    products_impacted: productsImpacted,
    sources
  };
}

export function normalizeCompetitorConfigs(raw: RawCompetitorConfig[]) {
  return raw.map((item, index) => normalizeCompetitorConfig(item, index));
}

export function readCompetitorFile(raw: string): CompetitorFile {
  return yaml.load(raw) as CompetitorFile;
}

export function createDeterministicId(name: string, website: string) {
  return crypto.createHash("sha1").update(`${name}|${website}`).digest("hex").slice(0, 12);
}
