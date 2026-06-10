import fs from "node:fs";
import path from "node:path";
import { format } from "date-fns";
import { loadConfig } from "./loadConfig.js";
import { crawlWebsite } from "./crawlWebsite.js";
import { collectNews } from "./collectNews.js";
import { collectSocial } from "./collectSocial.js";
import { hashContent, hasChanged, readState, writeState } from "./detectChanges.js";
import { scoreImpact } from "./scoreImpact.js";
import { generateEmailHtml, generateEmailMarkdown, writeExports } from "./generateEmail.js";
import type { EventFacts, EventConfidence } from "./loadConfig.js";
import type { EventItem } from "../lib/types.js";

const root = process.cwd();
const dataDir = path.join(root, "data");
const logsDir = path.join(dataDir, "logs");
const eventsPath = path.join(dataDir, "events.jsonl");
const statePath = path.join(dataDir, "state.json");

function ensureDirs() {
  fs.mkdirSync(logsDir, { recursive: true });
}

function logLine(message: string) {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  const logFile = path.join(logsDir, `${format(new Date(), "yyyy-MM-dd")}.log`);
  fs.appendFileSync(logFile, `${line}\n`);
}

function appendEvent(event: unknown) {
  fs.appendFileSync(eventsPath, `${JSON.stringify(event)}\n`);
}

function normalizeProductName(name?: string) {
  return (name ?? "").trim();
}

function mergeFacts(existing?: EventFacts, incoming?: EventFacts): EventFacts | undefined {
  if (!existing && !incoming) return undefined;
  return {
    ...existing,
    ...incoming,
    price_changes: [...(existing?.price_changes ?? []), ...(incoming?.price_changes ?? [])],
    new_partnerships: [...(existing?.new_partnerships ?? []), ...(incoming?.new_partnerships ?? [])],
    new_features: [...(existing?.new_features ?? []), ...(incoming?.new_features ?? [])]
  };
}

function normalizeConfidence(value: string): EventConfidence {
  if (value === "high" || value === "med" || value === "low") return value;
  return "low";
}

function collectQuotes(quotes?: string[]) {
  return (quotes ?? []).slice(0, 3).map((quote) => quote.slice(0, 180));
}

function readHistoricalEvents(filePath: string) {
  if (!fs.existsSync(filePath)) return [] as EventItem[];
  return fs
    .readFileSync(filePath, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as EventItem);
}

async function run() {
  ensureDirs();
  const runDate = new Date();
  const dateLabel = format(runDate, "yyyy-MM-dd");
  logLine("Starting weekly digest");

  const { competitors, products } = loadConfig();
  const state = readState(statePath);
  const nextHashes = { ...state.hashes };
  const history = readHistoricalEvents(eventsPath);
  const digestEvents: EventItem[] = [];

  for (const competitor of competitors) {
    try {
      logLine(`Processing ${competitor.name}`);
      const siteSnapshots = await crawlWebsite(competitor.website);
      for (const snapshot of siteSnapshots) {
        const changed = hasChanged(snapshot.url, snapshot.hash, state.hashes);
        if (!changed) continue;
        nextHashes[snapshot.url] = snapshot.hash;
        const text = `${snapshot.title}\n${snapshot.description}\n${snapshot.text}`;
        const impacts = scoreImpact(
          [
            text,
            competitor.notes ?? "",
            ...(competitor.tags ?? []),
            ...(competitor.products_impacted ?? [])
          ].join("\n"),
          products,
          {
            region: competitor.regions?.[0],
            market: competitor.markets?.[0]
          }
        );
        const previousEvent = [...history].reverse().find((item) => item.url === snapshot.url);
        const eventFacts = mergeFacts(previousEvent?.facts, snapshot.facts);
        if (eventFacts?.price_changes?.length) {
          const prevPrice = previousEvent?.facts?.price_changes?.[0];
          if (prevPrice) {
            eventFacts.price_changes = eventFacts.price_changes.map((price, index) =>
              index === 0
                ? {
                    ...price,
                    old_price: prevPrice.new_price ?? prevPrice.old_price ?? price.old_price
                  }
                : price
            );
          }
        }
        const event: EventItem = {
          id: `website-${competitor.name}-${snapshot.hash.slice(0, 8)}`,
          competitor: competitor.name,
          type: eventFacts?.price_changes?.length ? "price_change" : eventFacts?.new_partnerships?.length ? "partnership" : eventFacts?.new_features?.length ? "feature" : "website_change",
          source: snapshot.url,
          title: snapshot.title || snapshot.url,
          snippet: snapshot.description || snapshot.text.slice(0, 240),
          url: snapshot.url,
          date: dateLabel,
          confidence: "high",
          summary: snapshot.description || snapshot.text.slice(0, 240),
          evidenceQuotes: collectQuotes(snapshot.evidenceQuotes),
          facts: eventFacts,
          product: impacts.map((item) => item.product),
          productImpacts: impacts
        };
        digestEvents.push(event);
        appendEvent(event);
        history.push(event);
      }

      const socialItems = await collectSocial(competitor);
      for (const item of socialItems) {
        const event: EventItem = {
          id: `social-${competitor.name}-${Buffer.from(item.url).toString("hex").slice(0, 8)}`,
          competitor: competitor.name,
          type: `social_${item.source}`,
          source: item.source,
          title: item.title,
          snippet: item.snippet,
          url: item.url,
          date: item.date ?? dateLabel,
          confidence: normalizeConfidence(item.confidence),
          summary: item.snippet,
          evidenceQuotes: collectQuotes([item.snippet]),
          product: scoreImpact(
            `${item.title}\n${item.snippet}\n${competitor.tags?.join(" ") ?? ""}\n${competitor.products_impacted?.join(" ") ?? ""}`,
            products
          ).map((item) => item.product),
          productImpacts: scoreImpact(
            `${item.title}\n${item.snippet}\n${competitor.tags?.join(" ") ?? ""}\n${competitor.products_impacted?.join(" ") ?? ""}`,
            products
          )
        };
        digestEvents.push(event);
        appendEvent(event);
      }

      const newsItems = await collectNews(competitor.name);
      for (const item of newsItems) {
        const event: EventItem = {
          id: `news-${competitor.name}-${Buffer.from(item.url).toString("hex").slice(0, 8)}`,
          competitor: competitor.name,
          type: "news",
          source: item.source,
          title: item.title,
          snippet: item.snippet,
          url: item.url,
          date: item.date ?? dateLabel,
          confidence: normalizeConfidence(item.confidence),
          summary: item.snippet,
          evidenceQuotes: collectQuotes([item.snippet]),
          product: scoreImpact(
            `${item.title}\n${item.snippet}\n${competitor.tags?.join(" ") ?? ""}\n${competitor.products_impacted?.join(" ") ?? ""}`,
            products
          ).map((item) => item.product),
          productImpacts: scoreImpact(
            `${item.title}\n${item.snippet}\n${competitor.tags?.join(" ") ?? ""}\n${competitor.products_impacted?.join(" ") ?? ""}`,
            products
          )
        };
        digestEvents.push(event);
        appendEvent(event);
      }
    } catch (error) {
      logLine(`Failed ${competitor.name}: ${(error as Error).message}`);
      continue;
    }
  }

  const markdown = generateEmailMarkdown(runDate, digestEvents);
  const html = generateEmailHtml(markdown);
  writeExports(dateLabel, markdown, html);

  writeState(statePath, { last_run: new Date().toISOString(), hashes: nextHashes });
  logLine(`Completed with ${digestEvents.length} events`);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
