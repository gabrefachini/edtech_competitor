import type { EventItem } from "../../lib/types";
import type { CompetitorItem } from "../../lib/types";
import type { Product } from "../loadConfig";
import { extractFacts } from "./extractors";
import { fetchHtmlPage, hashContent, normalizeUrl, robotsAllows } from "./shared";
import { scoreImpact } from "../scoreImpact";

const HEURISTIC_PATHS = [
  "/",
  "/pricing",
  "/price",
  "/plans",
  "/blog",
  "/news",
  "/release-notes",
  "/updates",
  "/careers",
  "/partners",
  "/integrations",
  "/case-studies"
];

export type PageSnapshot = {
  competitor_id: string;
  competitor_name: string;
  url: string;
  title: string;
  cleaned_text: string;
  hash: string;
  collected_at: string;
  status: "ok" | "blocked" | "http_error" | "empty";
};

export type CollectorStatus = "ok" | "blocked" | "http_error" | "empty" | "rate_limited";

export type WebsiteCollectorResult = {
  snapshots: PageSnapshot[];
  events: EventItem[];
  status: CollectorStatus;
  pages_collected_7d: number;
  last_collected_at: string | null;
  source_status: CollectorStatus;
  errors: string[];
};

function uniqueUrls(urls: string[]) {
  return [...new Set(urls.map((item) => item.trim()).filter(Boolean))];
}

function buildTargetUrls(competitor: CompetitorItem) {
  const sources = competitor.sources?.website ?? [];
  const explicit = sources.map((entry) => entry.url).filter(Boolean) as string[];
  const roots = explicit.length ? explicit : [competitor.website];
  const targets = new Set<string>();
  for (const root of roots) {
    targets.add(root);
    try {
      const base = new URL(root).origin;
      if (base) {
        for (const path of HEURISTIC_PATHS) {
          targets.add(normalizeUrl(base, path));
        }
      }
    } catch {
      continue;
    }
  }
  return uniqueUrls([...targets]);
}

function collectEvidenceQuotes(text: string) {
  const quotes = text
    .split(/[\n\r]+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 16)
    .slice(0, 3);
  return quotes.length ? quotes : [text.slice(0, 160)];
}

function dedupeImpacts(impacts: ReturnType<typeof scoreImpact>) {
  return impacts.map((impact) => ({
    product: impact.product,
    score: impact.score,
    why: impact.why ?? impact.reason
  }));
}

export async function collectWebsiteSignals(
  competitor: CompetitorItem,
  products: Product[],
  stateHashes: Record<string, string> = {},
  collectedAt = new Date().toISOString()
): Promise<WebsiteCollectorResult> {
  const snapshots: PageSnapshot[] = [];
  const events: EventItem[] = [];
  const errors: string[] = [];
  const urls = buildTargetUrls(competitor);
  let lastCollectedAt: string | null = null;
  let sawBlocked = false;
  let sawRateLimited = false;
  let sawHttpError = false;
  let sawSuccess = false;

  for (const url of urls) {
    try {
      const base = new URL(url).origin;
      const allowed = await robotsAllows(base, url);
      if (!allowed) {
        sawBlocked = true;
        snapshots.push({
          competitor_id: competitor.id,
          competitor_name: competitor.name,
          url,
          title: "",
          cleaned_text: "",
          hash: hashContent("blocked_by_robots"),
          collected_at: collectedAt,
          status: "blocked"
        });
        continue;
      }

      const page = await fetchHtmlPage(url);
      if (!page) {
        sawHttpError = true;
        continue;
      }

      if (page.statusCode === 429) {
        sawRateLimited = true;
      }

      const title = page.title || url;
      const cleanedText = page.cleanedText || page.description || "";
      const hash = hashContent([title, cleanedText].join("\n"));
      const changed = stateHashes[url] !== hash;
      sawSuccess = true;
      lastCollectedAt = collectedAt;

      snapshots.push({
        competitor_id: competitor.id,
        competitor_name: competitor.name,
        url,
        title,
        cleaned_text: cleanedText,
        hash,
        collected_at: collectedAt,
        status: cleanedText ? "ok" : "empty"
      });

      if (!changed) continue;

      const facts = extractFacts(url, title, cleanedText);
      const impacts = dedupeImpacts(
        scoreImpact(
          [
            title,
            page.description,
            cleanedText,
            competitor.tags.join(" "),
            competitor.impacted_products.join(" ")
          ].join("\n"),
          products,
          { region: competitor.regions[0], market: competitor.markets[0] }
        )
      );
      const summary = page.description || cleanedText.slice(0, 240) || title;
      const event: EventItem = {
        id: `website-${competitor.id}-${hash.slice(0, 10)}`,
        competitor: competitor.name,
        type: facts?.price_changes?.length ? "price_change" : facts?.new_partnerships?.length ? "partnership" : facts?.new_features?.length ? "feature" : "website_change",
        source: "website",
        confidence: "high",
        url,
        date: collectedAt.slice(0, 10),
        title,
        snippet: summary,
        summary,
        published_at: page.publishedAt,
        product: impacts.map((item) => item.product),
        evidence_urls: [url],
        evidenceQuotes: collectEvidenceQuotes(cleanedText),
        facts,
        productImpacts: impacts.map((item) => ({
          product: item.product,
          score: item.score,
          reason: item.why,
          why: item.why
        })),
        tags: {
          impacted_products: impacts.map((item) => ({
            product: item.product,
            score: item.score,
            why: item.why
          }))
        }
      };
      events.push(event);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "unknown_error");
      sawHttpError = true;
    }
  }

  const status: CollectorStatus = sawSuccess ? "ok" : sawRateLimited ? "rate_limited" : sawBlocked ? "blocked" : sawHttpError ? "http_error" : "empty";
  return {
    snapshots,
    events,
    status,
    pages_collected_7d: snapshots.filter((snapshot) => snapshot.status === "ok" || snapshot.status === "empty").length,
    last_collected_at: lastCollectedAt,
    source_status: status,
    errors
  };
}
