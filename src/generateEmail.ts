import fs from "node:fs";
import path from "node:path";
import { format } from "date-fns";
import type { EventItem } from "../lib/types";
import { attachEvidenceToMetrics, computeExecutiveMetrics, formatLinksMarkdown } from "../lib/reportMetrics";
import { resolveProjectPath } from "../lib/projectPaths";

function summarizeFacts(event: EventItem) {
  const facts = event.facts;
  if (!facts) return "";
  const pieces: string[] = [];
  if (facts.price_changes?.length) {
    const price = facts.price_changes[0];
    const change = price.old_price && price.new_price ? `from ${price.old_price} to ${price.new_price}` : price.new_price ? `now ${price.new_price}` : facts.pricing_model === "quote_based" ? "quote-based / price not published" : "contact sales / price not published";
    pieces.push(`price ${change}`);
  } else if (facts.pricing_model) {
    pieces.push(facts.pricing_model === "quote_based" ? "quote-based / price not published" : "contact sales / price not published");
  }
  if (facts.new_partnerships?.length) {
    pieces.push(`partnership with ${facts.new_partnerships[0].partner_name}`);
  }
  if (facts.new_features?.length) {
    pieces.push(`feature ${facts.new_features[0].feature_name}`);
  }
  return pieces.join(" • ");
}

function formatQuotes(quotes?: string[]) {
  const unique = [...new Set((quotes ?? []).map((q) => q.trim()).filter(Boolean))].slice(0, 3);
  return unique.length ? unique.map((quote) => `> ${quote.slice(0, 180)}`).join("\n") : "";
}

function evidenceLinks(event: EventItem) {
  const urls = event.evidence_urls?.length ? event.evidence_urls : [event.url];
  return urls
    .map((url) => {
      const label = new URL(url).hostname.replace(/^www\./, "");
      return `[${label}](${url})`;
    })
    .join(", ");
}

export function generateEmailMarkdown(runDate: Date, events: EventItem[], lastWeekEvents: EventItem[], competitors: Array<{ name: string }> = []) {
  const dateLabel = format(runDate, "yyyy-MM-dd");
  const metrics = attachEvidenceToMetrics(computeExecutiveMetrics(events, lastWeekEvents, competitors as any), events);

  const top5 = [...events]
    .sort((a, b) => {
      const score = (event: EventItem) => {
        const facts = event.facts;
        if (facts?.price_changes?.length || facts?.pricing_model) return 0;
        if (facts?.new_partnerships?.length) return 1;
        if (facts?.new_features?.length) return 2;
        if (event.type.includes("bid")) return 3;
        return 4;
      };
      return score(a) - score(b);
    })
    .slice(0, 5);

  const lines: string[] = [];
  lines.push(`# Weekly Summary - ${dateLabel}`);
  lines.push("");
  lines.push("## Executive Summary");
  lines.push(`- Competitors monitored: **${metrics.competitors_monitored}**`);
  lines.push(`- Sources analyzed: **${metrics.sources_analyzed_count}**`);
  lines.push(`- Events 7d: **${metrics.events_7d_total}**`);
  lines.push(`- Site changes 7d: **${metrics.site_changes_7d}**`);
  lines.push(`- Social posts 7d: **${metrics.social_posts_7d}**`);
  lines.push(`- Videos 7d: **${metrics.youtube_videos_7d}**`);
  lines.push(`- News mentions 7d: **${metrics.news_mentions_7d}**`);
  lines.push(`- Bids 7d: **${metrics.bids_7d ?? 0}**`);
  lines.push("");
  lines.push("### KPI Sources");
  const kpiEntries = Object.entries(metrics.evidence.byKpi) as Array<[string, Array<{ url: string; title?: string }>]>;
  kpiEntries.forEach(([label, links]) => {
    lines.push(`- **${label}**: ${formatLinksMarkdown(links as any)}`);
  });
  lines.push("");
  lines.push("## Top 5 Movements");
  top5.forEach((event, index) => {
    const factSummary = summarizeFacts(event);
    const quotes = formatQuotes(event.evidenceQuotes);
    lines.push(`${index + 1}. **${event.competitor}**: ${event.title}${factSummary ? ` - ${factSummary}` : ""}`);
    lines.push(`   - ${event.snippet}`);
    if (quotes) lines.push(quotes);
    lines.push(`   - Sources: ${evidenceLinks(event)}`);
  });
  lines.push("");
  lines.push("## Updates by Competitor");
  for (const event of events) {
    lines.push(`### ${event.competitor}`);
    lines.push(`- ${event.title}`);
    lines.push(`- ${event.summary}`);
    if (event.facts?.price_changes?.length) {
      const price = event.facts.price_changes[0];
      const summary = price.old_price && price.new_price ? `from ${price.old_price} to ${price.new_price}` : price.new_price ? `now ${price.new_price}` : event.facts.pricing_model === "quote_based" ? "quote-based / price not published" : "contact sales / price not published";
      lines.push(`- Fact: price ${summary}`);
    } else if (event.facts?.pricing_model) {
      lines.push(`- Fact: ${event.facts.pricing_model === "quote_based" ? "quote-based / price not published" : "contact sales / price not published"}`);
    }
    if (event.facts?.new_partnerships?.length) {
      const partnership = event.facts.new_partnerships[0];
      lines.push(`- Fact: partnership with ${partnership.partner_name}`);
    }
    if (event.facts?.new_features?.length) {
      const feature = event.facts.new_features[0];
      lines.push(`- Fact: feature ${feature.feature_name}${feature.description_short ? ` - ${feature.description_short}` : ""}`);
    }
    if (event.evidenceQuotes?.length) {
      lines.push(`- Evidence:`);
      event.evidenceQuotes.slice(0, 3).forEach((quote: string) => lines.push(`  - ${quote}`));
    }
    lines.push(`- Sources: ${evidenceLinks(event)}`);
    if (event.productImpacts?.length) {
      lines.push(`- Impact: ${event.productImpacts.map((p: { product: string; score: number }) => `${p.product} (${p.score})`).join(", ")}`);
    }
    lines.push("");
  }
  lines.push("## Product Impact");
  const all = events.flatMap((e) => e.productImpacts ?? []);
  const grouped = new Map<string, number>();
  all.forEach((impact) => grouped.set(impact.product, (grouped.get(impact.product) ?? 0) + impact.score));
  [...grouped.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([product, score]) => {
      const reasons = all
        .filter((impact) => impact.product === product)
        .map((impact) => impact.reason || impact.why || "")
        .slice(0, 2);
      lines.push(`- **${product}**: score ${score}`);
      reasons.filter(Boolean).forEach((reason) => lines.push(`  - ${reason}`));
    });
  lines.push("");
  lines.push("## Metrics with Sources");
  lines.push(`- ${formatLinksMarkdown(metrics.evidence.byKpi.events_7d_total)}`);
  lines.push("");
  lines.push("## Next Steps");
  lines.push("- Product: review roadmap and opportunities cited in the events.");
  lines.push("- Public sales: watch bids and tender activity.");
  lines.push("- Private sales: prioritize expansion, pricing and partnerships.");
  lines.push("- Marketing: map messages, launches and positioning.");
  return lines.join("\n");
}

export function generateEmailHtml(markdown: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Competitive Digest</title></head><body><pre style="white-space:pre-wrap;font-family:Arial, sans-serif">${markdown.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] ?? c))}</pre></body></html>`;
}

export function writeExports(dateLabel: string, markdown: string, html: string) {
  const dir = resolveProjectPath("exports", "weekly");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${dateLabel}.md`), markdown);
  fs.writeFileSync(path.join(dir, `${dateLabel}.html`), html);
}
