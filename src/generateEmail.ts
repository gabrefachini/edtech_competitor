import fs from "node:fs";
import path from "node:path";
import { format } from "date-fns";
import type { EventItem } from "../lib/types.js";
import { attachEvidenceToMetrics, computeExecutiveMetrics, formatLinksMarkdown } from "../lib/reportMetrics.js";

function summarizeFacts(event: EventItem) {
  const facts = event.facts;
  if (!facts) return "";
  const pieces: string[] = [];
  if (facts.price_changes?.length) {
    const price = facts.price_changes[0];
    const change = price.old_price && price.new_price ? `de ${price.old_price} para ${price.new_price}` : price.new_price ? `agora ${price.new_price}` : "agora é contact sales";
    pieces.push(`preço ${change}`);
  }
  if (facts.new_partnerships?.length) {
    pieces.push(`parceria com ${facts.new_partnerships[0].partner_name}`);
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

export function generateEmailMarkdown(runDate: Date, events: EventItem[]) {
  const dateLabel = format(runDate, "yyyy-MM-dd");
  const metrics = attachEvidenceToMetrics(computeExecutiveMetrics(events, events), events);
  const top5 = [...events].sort((a, b) => {
    const score = (event: EventItem) => {
      const facts = event.facts;
      if (facts?.price_changes?.length) return 0;
      if (facts?.new_partnerships?.length) return 1;
      if (facts?.new_features?.length) return 2;
      if (event.type.includes("bid")) return 3;
      return 4;
    };
    return score(a) - score(b);
  }).slice(0, 5);
  const lines: string[] = [];
  lines.push(`# Resumo Semanal - ${dateLabel}`);
  lines.push("");
  lines.push("## Resumo executivo");
  top5.forEach((event, index) => {
    const factSummary = summarizeFacts(event);
    const quotes = formatQuotes(event.evidenceQuotes);
    lines.push(`${index + 1}. **${event.competitor}**: ${event.title}${factSummary ? ` - ${factSummary}` : ""}`);
    lines.push(`   - ${event.snippet}`);
    if (quotes) lines.push(quotes);
    lines.push(`   - Fonte: [${new URL(event.url).hostname.replace(/^www\./, "")}](${event.url})`);
  });
  lines.push("");
  lines.push("## Atualizações por concorrente");
  for (const event of events) {
    lines.push(`### ${event.competitor}`);
    lines.push(`- ${event.title}`);
    lines.push(`- ${event.snippet}`);
    if (event.facts?.price_changes?.length) {
      const price = event.facts.price_changes[0];
      const summary = price.old_price && price.new_price ? `de ${price.old_price} para ${price.new_price}` : price.new_price ? `agora ${price.new_price}` : "agora é contact sales";
      lines.push(`- Fato: preço ${summary}`);
    }
    if (event.facts?.new_partnerships?.length) {
      const partnership = event.facts.new_partnerships[0];
      lines.push(`- Fato: parceria com ${partnership.partner_name}`);
    }
    if (event.facts?.new_features?.length) {
      const feature = event.facts.new_features[0];
      lines.push(`- Fato: feature ${feature.feature_name}${feature.description_short ? ` - ${feature.description_short}` : ""}`);
    }
    if (event.evidenceQuotes?.length) {
      lines.push(`- Evidências:`);
      event.evidenceQuotes.slice(0, 3).forEach((quote: string) => lines.push(`  - ${quote}`));
    }
    lines.push(`- Fonte: [${new URL(event.url).hostname.replace(/^www\./, "")}](${event.url})`);
    if (event.productImpacts?.length) {
      lines.push(`- Impacto: ${event.productImpacts.map((p: { product: string; score: number }) => `${p.product} (${p.score})`).join(", ")}`);
    }
    lines.push("");
  }
  lines.push("## Impacto por produto Positivo");
  const all = events.flatMap((e) => e.productImpacts ?? []);
  const grouped = new Map<string, number>();
  all.forEach((impact) => grouped.set(impact.product, (grouped.get(impact.product) ?? 0) + impact.score));
  [...grouped.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([product, score]) => {
      const reasons = all
        .filter((impact) => impact.product === product)
        .map((impact) => impact.reason)
        .slice(0, 2);
      lines.push(`- **${product}**: score ${score}`);
      reasons.forEach((reason) => lines.push(`  - ${reason}`));
    });
  lines.push("");
  lines.push("## Métricas com fontes");
  lines.push(`- ${formatLinksMarkdown(metrics.evidence.byKpi.events_7d_total)}`);
  lines.push("");
  lines.push("## Próximas ações sugeridas");
  lines.push("- Produto: revisar roadmap e oportunidades citadas nos eventos.");
  lines.push("- Comercial Público: verificar movimentos ligados a compra pública, licitações e instituições.");
  lines.push("- Comercial Privado: acompanhar expansão, pricing e parcerias.");
  lines.push("- Marketing: mapear mensagens, lançamentos e posicionamento.");
  return lines.join("\n");
}

export function generateEmailHtml(markdown: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Competitive Digest</title></head><body><pre style="white-space:pre-wrap;font-family:Arial, sans-serif">${markdown.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] ?? c))}</pre></body></html>`;
}

export function writeExports(dateLabel: string, markdown: string, html: string) {
  const dir = path.join(process.cwd(), "exports", "weekly");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${dateLabel}.md`), markdown);
  fs.writeFileSync(path.join(dir, `${dateLabel}.html`), html);
}
