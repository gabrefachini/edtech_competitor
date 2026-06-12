import * as cheerio from "cheerio";
import { hashContent } from "./detectChanges";
import type { EventFacts } from "./loadConfig";

export type PageSnapshot = {
  url: string;
  title: string;
  description: string;
  text: string;
  hash: string;
  facts?: EventFacts;
  evidenceQuotes?: string[];
};

const DEFAULT_PATHS = ["/", "/product", "/products", "/solutions", "/pricing", "/blog", "/news", "/release-notes", "/updates", "/partners", "/integrations", "/case-studies", "/careers"];

function normalizeUrl(base: string, targetPath: string) {
  return new URL(targetPath, base).toString();
}

async function robotsAllows(baseUrl: string, targetUrl: string) {
  try {
    const robotsUrl = new URL("/robots.txt", baseUrl).toString();
    const res = await fetch(robotsUrl, { redirect: "follow" });
    if (!res.ok) return true;
    const txt = await res.text();
    if (/Disallow:\s*\/\s*$/im.test(txt) && targetUrl.startsWith(baseUrl)) return false;
    return true;
  } catch {
    return true;
  }
}

function cleanText($: cheerio.CheerioAPI) {
  $("script, style, nav, header, footer, aside, noscript").remove();
  const text = $("body").text().replace(/\s+/g, " ").trim();
  return text.slice(0, 12000);
}

function compactText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function quoteSnippets(text: string, patterns: RegExp[], maxQuotes = 3) {
  const normalized = compactText(text);
  const quotes: string[] = [];
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (!match) continue;
    const quote = (match[0] || "").slice(0, 180);
    if (quote && !quotes.includes(quote)) quotes.push(quote);
    if (quotes.length >= maxQuotes) break;
  }
  return quotes;
}

function inferFacts(url: string, title: string, text: string): EventFacts | undefined {
  const lower = `${url} ${title} ${text}`.toLowerCase();
  const facts: EventFacts = {};

  const currencyPatterns = [
    { currency: "R$", regex: /(R\$\s?\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/i },
    { currency: "USD", regex: /(\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i },
    { currency: "€", regex: /(€\s?\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/i },
    { currency: "£", regex: /(£\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i }
  ];
  const periodPatterns = [
    { label: "monthly", regex: /(monthly|por mês|mensal|month)/i },
    { label: "annual", regex: /(annual|annually|por ano|anual|year)/i },
    { label: "per user", regex: /(per user|por usuário|per seat|por assento)/i },
    { label: "per student", regex: /(per student|por aluno|per learner)/i }
  ];

  if (url.includes("pricing") || url.includes("plans")) {
    const priceMatches: EventFacts["price_changes"] = [];
    const billingPeriod = periodPatterns.find((item) => item.regex.test(lower))?.label;
    const region = lower.includes("br") || lower.includes("brazil") ? "BR" : lower.includes("latam") ? "LATAM" : lower.includes("global") ? "GLOBAL" : undefined;
    let foundPrice = false;
    for (const item of currencyPatterns) {
      const match = text.match(item.regex);
      if (!match) continue;
      foundPrice = true;
      priceMatches.push({
        plan_name: title || undefined,
        old_price: null,
        new_price: match[1],
        currency: item.currency,
        billing_period: billingPeriod,
        region,
        source_url: url
      });
    }
    if (priceMatches.length) {
      facts.price_changes = priceMatches;
    } else if (!foundPrice) {
      facts.pricing_model = "contact_sales";
    }
  }

  if (url.includes("partners") || url.includes("integrations")) {
    const partnershipType = lower.includes("integration") || lower.includes("integrat") ? "integration" : lower.includes("reseller") || lower.includes("revenda") ? "reseller" : lower.includes("content") ? "content" : lower.includes("ai") || lower.includes("artificial intelligence") ? "ai" : lower.includes("hardware") || lower.includes("device") ? "hardware" : "other";
    const partnerMatch = text.match(/(?:with|com|parceria com|partner(?:ship)? with)\s+([A-ZÀ-ÿ0-9][A-Za-zÀ-ÿ0-9&().,'’\-\s]{2,80})/i);
    const partnerName = partnerMatch?.[1]?.trim().replace(/[.,;:)\]]+$/, "");
    if (partnerName) {
      facts.new_partnerships = [
        {
          partner_name: partnerName,
          partnership_type: partnershipType,
          scope: lower.includes("public") && lower.includes("private") ? "both" : lower.includes("public") ? "public" : lower.includes("private") ? "private" : "both",
          source_url: url
        }
      ];
    }
  }

  if (url.includes("release-notes") || url.includes("updates") || url.includes("changelog") || url.includes("blog")) {
    const featureNameMatch = text.match(/(?:new|nova|novidade|feature)\s+([A-ZÀ-ÿ0-9][A-Za-zÀ-ÿ0-9&().,'’\-\s]{2,80})/i);
    const featureName = featureNameMatch?.[1]?.trim().replace(/[.,;:)\]]+$/, "");
    const quotes = quoteSnippets(text, [
      /(?:new|nova|novidade|feature)[^.]{0,140}\./i,
      /(?:released|lançado|launch)[^.]{0,140}\./i,
      /(?:improves|melhora|ajuda)[^.]{0,140}\./i
    ]);
    if (featureName) {
      facts.new_features = [
        {
          feature_name: featureName,
          area: url.includes("blog") ? "blog" : url.includes("updates") ? "updates" : "release-notes",
          description_short: quotes[0]?.slice(0, 160),
          source_url: url
        }
      ];
    }
  }

  return Object.keys(facts).length ? facts : undefined;
}

export async function crawlWebsite(website: string, paths = DEFAULT_PATHS): Promise<PageSnapshot[]> {
  const snapshots: PageSnapshot[] = [];
  for (const targetPath of paths) {
    const url = normalizeUrl(website, targetPath);
    const allowed = await robotsAllows(website, url);
    if (!allowed) {
      snapshots.push({ url, title: "", description: "blocked_by_robots", text: "", hash: hashContent("blocked_by_robots") });
      continue;
    }
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (!res.ok || !res.headers.get("content-type")?.includes("text/html")) continue;
      const html = await res.text();
      const $ = cheerio.load(html);
      const title = ($("title").text() || "").trim();
      const description = ($('meta[name="description"]').attr("content") || "").trim();
      const text = cleanText($);
      const hash = hashContent([title, description, text].join("\n"));
      const facts = inferFacts(url, title, text);
      const evidenceQuotes = quoteSnippets(text, [
        /R\$\s?\d{1,3}(?:\.\d{3})*(?:,\d{2})?/i,
        /\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/i,
        /€\s?\d{1,3}(?:\.\d{3})*(?:,\d{2})?/i,
        /£\s?\d{1,3}(?:,\d{3})*(?:,\d{2})?/i,
        /(?:partner|parceria|integration|integration with|novo|new|feature|lançado|released)/i
      ]);
      snapshots.push({ url, title, description, text, hash, facts, evidenceQuotes });
    } catch {
      continue;
    }
  }
  return snapshots;
}
