import type { EventItem } from "../../lib/types";
import type { CompetitorItem } from "../../lib/types";
import type { Product } from "../loadConfig";
import { extractFacts } from "./extractors";
import { fetchHtmlPage, searchDuckDuckGo, sha256 } from "./shared";
import { scoreImpact } from "../scoreImpact";
import type { CollectorStatus } from "./websiteCollector";

export type YouTubeCollectorResult = {
  events: EventItem[];
  status: CollectorStatus;
  items_found: number;
  last_collected_at: string | null;
  errors: string[];
};

function queryList(competitor: CompetitorItem) {
  const configured = competitor.sources?.youtube
    ?.map((entry) => entry.query || entry.channel_url || entry.url)
    .filter(Boolean) as string[] | undefined;
  return configured?.length ? configured : [`${competitor.name} YouTube`, `${competitor.name} product demo`, `${competitor.name} webinar`];
}

function evidenceQuotes(snippet: string, text: string) {
  const quote = text ? text.slice(0, 180) : snippet.slice(0, 180);
  return [quote];
}

export async function collectYouTubeSignals(
  competitor: CompetitorItem,
  products: Product[],
  collectedAt = new Date().toISOString()
): Promise<YouTubeCollectorResult> {
  const events: EventItem[] = [];
  const errors: string[] = [];
  let lastCollectedAt: string | null = null;

  for (const query of queryList(competitor)) {
    try {
      const hits = await searchDuckDuckGo(`site:youtube.com/watch ${query} past week`, 4);
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
        const uniqueId = await sha256(`${competitor.id}|youtube|${hit.url}|${title}`);
        events.push({
          id: `youtube-${uniqueId.slice(0, 12)}`,
          competitor: competitor.name,
          type: "youtube",
          source: "youtube",
          confidence: "med",
          url: hit.url,
          date: (publishedAt || collectedAt).slice(0, 10),
          title,
          snippet: hit.snippet || text.slice(0, 220),
          summary: hit.snippet || text.slice(0, 220),
          published_at: publishedAt,
          channel: page?.channel,
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
