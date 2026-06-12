import type { EventItem } from "../../lib/types";
import type { CompetitorItem } from "../../lib/types";
import type { Product } from "../loadConfig";
import { extractFacts } from "./extractors";
import { fetchHtmlPage, searchDuckDuckGo, sha256 } from "./shared";
import { scoreImpact } from "../scoreImpact";
import type { CollectorStatus } from "./websiteCollector";

export type NewsCollectorResult = {
  events: EventItem[];
  status: CollectorStatus;
  items_found: number;
  last_collected_at: string | null;
  errors: string[];
};

function queryList(competitor: CompetitorItem) {
  const configured = competitor.sources?.news?.map((entry) => entry.query).filter(Boolean) as string[] | undefined;
  return configured?.length
    ? configured
    : [`${competitor.name} news`, `${competitor.name} launch partnership pricing`, `${competitor.name} site:news.google.com`];
}

function buildSnippet(title: string, snippet: string, text: string) {
  return snippet || text.slice(0, 220) || title;
}

function evidenceQuotes(snippet: string, text: string) {
  const lines = text
    .split(/[\n\r]+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 2);
  return lines.length ? lines : [snippet];
}

export async function collectNewsSignals(
  competitor: CompetitorItem,
  products: Product[],
  collectedAt = new Date().toISOString()
): Promise<NewsCollectorResult> {
  const events: EventItem[] = [];
  const errors: string[] = [];
  const queries = queryList(competitor);
  let lastCollectedAt: string | null = null;

  for (const query of queries) {
    try {
      const searchQuery = `${query} past week`;
      const hits = await searchDuckDuckGo(searchQuery, 5);
      for (const hit of hits) {
        const page = await fetchHtmlPage(hit.url);
        const title = page?.title || hit.title;
        const text = page?.cleanedText || hit.snippet || "";
        const publishedAt = page?.publishedAt;
        const facts = extractFacts(hit.url, title, text);
        const impacts = scoreImpact(
          [
            competitor.name,
            title,
            text,
            competitor.tags.join(" "),
            competitor.impacted_products.join(" ")
          ].join("\n"),
          products,
          { region: competitor.regions[0], market: competitor.markets[0] }
        );
        const uniqueId = await sha256(`${competitor.id}|news|${hit.url}|${title}`);
        events.push({
          id: `news-${uniqueId.slice(0, 12)}`,
          competitor: competitor.name,
          type: "news",
          source: "news",
          confidence: "med",
          url: hit.url,
          date: (publishedAt || collectedAt).slice(0, 10),
          title,
          snippet: buildSnippet(title, hit.snippet, text),
          summary: buildSnippet(title, hit.snippet, text),
          published_at: publishedAt,
          product: impacts.map((item) => item.product),
          evidence_urls: [hit.url],
          evidenceQuotes: evidenceQuotes(hit.snippet, text),
          facts,
          productImpacts: impacts.map((item) => ({ ...item, why: item.why ?? item.reason })),
          tags: {
            impacted_products: impacts.map((item) => ({ product: item.product, score: item.score, why: item.why ?? item.reason }))
          }
        });
        lastCollectedAt = collectedAt;
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "unknown_error");
    }
  }

  const status: CollectorStatus = events.length ? "ok" : errors.some((item) => /429|rate/i.test(item)) ? "rate_limited" : "empty";
  return {
    events,
    status,
    items_found: events.length,
    last_collected_at: lastCollectedAt,
    errors
  };
}
