import type { EventItem } from "../../lib/types";
import type { CompetitorItem } from "../../lib/types";
import type { Product } from "../loadConfig";
import { extractFacts } from "./extractors";
import { fetchHtmlPage, searchDuckDuckGo, sha256 } from "./shared";
import { scoreImpact } from "../scoreImpact";
import type { CollectorStatus } from "./websiteCollector";

export type SocialCollectorResult = {
  events: EventItem[];
  status: CollectorStatus;
  items_found: number;
  last_collected_at: string | null;
  errors: string[];
};

type Network = "linkedin" | "x" | "instagram";

function sourceEntries(competitor: CompetitorItem, network: Network) {
  return competitor.sources?.social?.[network] ?? [];
}

function fallbackQueries(competitor: CompetitorItem, network: Network) {
  return [
    `site:${network === "x" ? "x.com" : `${network}.com`} ${competitor.name} announcement feature partnership`,
    `site:${network === "instagram" ? "instagram.com" : `${network}.com`} ${competitor.name} launch`
  ];
}

function buildQueries(competitor: CompetitorItem, network: Network) {
  const entries = sourceEntries(competitor, network);
  const queries = entries
    .map((entry) => entry.query)
    .filter(Boolean) as string[];
  return queries.length ? queries : fallbackQueries(competitor, network);
}

function evidenceQuotes(snippet: string, text: string) {
  return text ? [text.slice(0, 180)] : [snippet.slice(0, 180)];
}

function networkLabel(network: Network) {
  return network;
}

export async function collectSocialSignals(
  competitor: CompetitorItem,
  products: Product[],
  collectedAt = new Date().toISOString()
): Promise<SocialCollectorResult> {
  const events: EventItem[] = [];
  const errors: string[] = [];
  let lastCollectedAt: string | null = null;

  for (const network of ["linkedin", "x", "instagram"] as const) {
    const queries = buildQueries(competitor, network);
    for (const query of queries) {
      try {
        const hits = await searchDuckDuckGo(`${query} past week`, 3);
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
          const uniqueId = await sha256(`${competitor.id}|social|${network}|${hit.url}|${title}`);
          events.push({
            id: `social-${uniqueId.slice(0, 12)}`,
            competitor: competitor.name,
            type: `social_${network}`,
            source: networkLabel(network),
            confidence: page ? "med" : "low",
            url: hit.url,
            date: (publishedAt || collectedAt).slice(0, 10),
            title,
            snippet: hit.snippet || text.slice(0, 220),
            summary: hit.snippet || text.slice(0, 220),
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
