import type { EventItem, CompetitorItem } from "./types";

type MetricValue = number | string | null;

export type EvidenceLink = {
  url: string;
  title?: string;
  type?: string;
  score?: number;
};

export type ExecutiveMetric = {
  label: string;
  value: MetricValue;
  delta?: MetricValue;
};

export type ExecutiveMetrics = {
  competitors_monitored: number;
  sources_analyzed_count: number;
  events_7d_total: number;
  delta_vs_last_week: number | null;
  site_changes_7d: number;
  social_posts_7d: number;
  youtube_videos_7d: number;
  news_mentions_7d: number;
  bids_7d: number | null;
  winners_detected: number | null;
  impact_by_product: Array<{ product: string; count: number; delta: number | null }>;
  top_competitors_by_activity: Array<{ competitor: string; count: number }>;
  confidence_distribution: { high: number; medium: number; low: number };
};

function formatDelta(current: number, previous: number) {
  if (!previous) return null;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function eventSourceBucket(type: string) {
  if (type.includes("website")) return "website_change";
  if (type.includes("youtube")) return "youtube";
  if (type.includes("social")) return "social";
  if (type.includes("bid") || type.includes("tender") || type.includes("rfp")) return "bid";
  return "news";
}

function confidenceKey(confidence: EventItem["confidence"]) {
  return confidence === "med" ? "medium" : confidence;
}

function countBy<T>(items: T[], getter: (item: T) => string) {
  return items.reduce<Record<string, number>>((acc, item) => {
    const key = getter(item);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function domainOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function normalizeEvidenceTitle(event: EventItem) {
  if (event.summary) return event.summary;
  return event.source || event.type || domainOf(event.url);
}

function sourcePriority(event: EventItem) {
  const type = `${event.type} ${event.source}`.toLowerCase();
  const url = event.url.toLowerCase();
  if (type.includes("website") || type.includes("release") || type.includes("blog") || type.includes("pricing") || url.includes("/release") || url.includes("/updates") || url.includes("/news")) return 0;
  if (type.includes("social") || type.includes("youtube")) return 1;
  if (type.includes("news")) return 2;
  if (type.includes("bid") || type.includes("tender") || type.includes("rfp")) return 3;
  return 4;
}

function dedupeLinks<T extends { url: string }>(links: T[]) {
  const seen = new Set<string>();
  return links.filter((link) => {
    const key = link.url.trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function factPriority(event: EventItem) {
  if (event.facts?.price_changes?.length) return 0;
  if (event.facts?.new_partnerships?.length) return 1;
  if (event.facts?.new_features?.length) return 2;
  if (event.type.includes("bid") || event.type.includes("tender") || event.type.includes("rfp")) return 3;
  return 4;
}

function summarizeFact(event: EventItem) {
  const facts = event.facts;
  if (facts?.price_changes?.length) {
    const price = facts.price_changes[0];
    if (price.old_price && price.new_price) return `preço de ${price.old_price} para ${price.new_price}`;
    if (price.new_price) return `agora ${price.new_price}`;
    return "agora é contact sales";
  }
  if (facts?.new_partnerships?.length) {
    return `parceria com ${facts.new_partnerships[0].partner_name}`;
  }
  if (facts?.new_features?.length) {
    const feature = facts.new_features[0];
    return `feature ${feature.feature_name}${feature.description_short ? ` - ${feature.description_short}` : ""}`;
  }
  if (event.type.includes("bid") || event.type.includes("tender") || event.type.includes("rfp")) {
    return "movimento de bid / edital";
  }
  return event.summary;
}

export function formatLinksMarkdown(links: EvidenceLink[]) {
  const unique = dedupeLinks(links).slice(0, 12);
  if (!unique.length) return "Fontes: —";
  return `Fontes: ${unique
    .map((link) => {
      const label = link.title?.trim() || domainOf(link.url);
      return `[${label}](${link.url})`;
    })
    .join(", ")}`;
}

export function pickEvidenceLinks(events: EventItem[], maxLinks: number, priorityOrder: string[] = ["website", "release", "blog", "social", "youtube", "news", "bid"]) {
  const scored = events
    .filter((event) => Boolean(event.url))
    .map((event) => {
      const text = `${event.type} ${event.source}`.toLowerCase();
      const priorityMatch = priorityOrder.findIndex((token) => text.includes(token));
      const priority = priorityMatch === -1 ? sourcePriority(event) + priorityOrder.length : priorityMatch;
      return {
        url: event.url,
        title: normalizeEvidenceTitle(event),
        type: event.type,
        score: priority * 100 + sourcePriority(event) * 10
      };
    })
    .sort((a, b) => a.score - b.score);
  return dedupeLinks(scored).slice(0, maxLinks);
}

export function attachEvidenceToMetrics(metrics: ExecutiveMetrics, events: EventItem[]) {
  const byKpi = {
    competitors_monitored: pickEvidenceLinks(events, 12),
    sources_analyzed_count: pickEvidenceLinks(events, 12),
    events_7d_total: pickEvidenceLinks(events, 12),
    site_changes_7d: pickEvidenceLinks(events.filter((event) => event.type.includes("website")), 12),
    social_posts_7d: pickEvidenceLinks(events.filter((event) => event.type.includes("social")), 12),
    youtube_videos_7d: pickEvidenceLinks(events.filter((event) => event.type.includes("youtube")), 12),
    news_mentions_7d: pickEvidenceLinks(events.filter((event) => event.type.includes("news")), 12),
    bids_7d: pickEvidenceLinks(events.filter((event) => event.type.includes("bid") || event.type.includes("tender") || event.type.includes("rfp")), 12),
    winners_detected: pickEvidenceLinks(events.filter((event) => event.type.includes("winner")), 12)
  };

  const topMovements = [...events]
    .sort((a, b) => factPriority(a) - factPriority(b))
    .slice(0, 5)
    .map((event) => ({
      event,
      evidence: pickEvidenceLinks([event], 5)
    }));

  const impactByProduct = metrics.impact_by_product.map((row) => {
    const productEvents = events
      .filter((event) => event.product.includes(row.product))
      .sort((a, b) => {
        const scoreA = a.product.includes(row.product) ? a.product.length : 0;
        const scoreB = b.product.includes(row.product) ? b.product.length : 0;
        return scoreB - scoreA;
      })
      .slice(0, 3);
    return {
      ...row,
      evidence: pickEvidenceLinks(productEvents, 3)
    };
  });

  return {
    ...metrics,
    evidence: {
      byKpi,
      topMovements,
      impactByProduct
    }
  };
}

export function computeExecutiveMetrics(events: EventItem[], lastWeekEvents: EventItem[] = [], competitors: CompetitorItem[] = []) : ExecutiveMetrics {
  const current = events ?? [];
  const previous = lastWeekEvents ?? [];
  const byConfidence = countBy(current, (event) => confidenceKey(event.confidence));
  const productCounts = countBy(current.flatMap((event) => event.product ?? []), (product) => product);
  const previousProductCounts = countBy(previous.flatMap((event) => event.product ?? []), (product) => product);
  const competitorCounts = countBy(current, (event) => event.competitor);

  const socialPosts = current.filter((event) => event.type.includes("social")).length;
  const youtubeVideos = current.filter((event) => event.type.includes("youtube")).length;
  const newsMentions = current.filter((event) => event.type.includes("news")).length;
  const bids = current.filter((event) => event.type.includes("bid") || event.type.includes("tender") || event.type.includes("rfp")).length;
  const winnersDetected = current.filter((event) => event.type.includes("winner")).length;
  const siteChanges = current.filter((event) => event.type.includes("website")).length;

  const sourceSet = new Set(current.map((event) => eventSourceBucket(event.type)));
  const impactByProduct = Object.entries(productCounts)
    .map(([product, count]) => ({
      product,
      count,
      delta: (count - (previousProductCounts[product] ?? 0))
    }))
    .sort((a, b) => b.count - a.count || a.product.localeCompare(b.product));

  const topCompetitors = Object.entries(competitorCounts)
    .map(([competitor, count]) => ({ competitor, count }))
    .sort((a, b) => b.count - a.count || a.competitor.localeCompare(b.competitor))
    .slice(0, 5);

  return {
    competitors_monitored: competitors.length || new Set(current.map((event) => event.competitor)).size,
    sources_analyzed_count: sourceSet.size,
    events_7d_total: current.length,
    delta_vs_last_week: formatDelta(current.length, previous.length),
    site_changes_7d: siteChanges,
    social_posts_7d: socialPosts,
    youtube_videos_7d: youtubeVideos,
    news_mentions_7d: newsMentions,
    bids_7d: bids || null,
    winners_detected: winnersDetected || null,
    impact_by_product: impactByProduct,
    top_competitors_by_activity: topCompetitors,
    confidence_distribution: {
      high: byConfidence.high ?? 0,
      medium: byConfidence.medium ?? 0,
      low: byConfidence.low ?? 0
    }
  };
}

export function fmtMetric(value: MetricValue) {
  return value === null || value === undefined || value === "" ? "—" : String(value);
}

export function fmtDelta(value: MetricValue) {
  if (value === null || value === undefined || value === "") return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return `${num > 0 ? "+" : ""}${num}%`;
}

export function buildWeeklyReportMarkdown(events: EventItem[], lastWeekEvents: EventItem[], competitors: CompetitorItem[] = []) {
  const metrics = attachEvidenceToMetrics(computeExecutiveMetrics(events, lastWeekEvents, competitors), events);

  const publicEvents = events.filter((event) => event.competitor && (event.competitor.toLowerCase().includes("clever") || event.competitor.toLowerCase().includes("wonde") || event.competitor.toLowerCase().includes("google") || event.competitor.toLowerCase().includes("microsoft")));
  const privateEvents = events.filter((event) => !publicEvents.includes(event));

  const lines: string[] = [];
  lines.push("# Resumo Semanal");
  lines.push("");
  lines.push("## Resumo Executivo");
  lines.push(`- Concorrentes monitorados: **${fmtMetric(metrics.competitors_monitored)}**`);
  lines.push(`- Fontes analisadas: **${fmtMetric(metrics.sources_analyzed_count)}**`);
  lines.push(`- Eventos 7d: **${fmtMetric(metrics.events_7d_total)}** (${fmtDelta(metrics.delta_vs_last_week)})`);
  lines.push(`- Mudanças no site 7d: **${fmtMetric(metrics.site_changes_7d)}**`);
  lines.push(`- Posts sociais 7d: **${fmtMetric(metrics.social_posts_7d)}**`);
  lines.push(`- Vídeos no YouTube 7d: **${fmtMetric(metrics.youtube_videos_7d)}**`);
  lines.push(`- Menções em notícias 7d: **${fmtMetric(metrics.news_mentions_7d)}**`);
  lines.push(`- Bids 7d: **${fmtMetric(metrics.bids_7d)}**`);
  lines.push(`- Vencedores detectados: **${fmtMetric(metrics.winners_detected)}**`);
  lines.push("");
  lines.push("### Distribuição de confiança");
  lines.push(`- Alta: **${metrics.confidence_distribution.high}**`);
  lines.push(`- Média: **${metrics.confidence_distribution.medium}**`);
  lines.push(`- Baixa: **${metrics.confidence_distribution.low}**`);
  lines.push("");
  lines.push("## Placar da Semana");
  lines.push("| KPI | Valor | Delta |");
  lines.push("| --- | ---: | ---: |");
  lines.push(`| Concorrentes monitorados | ${fmtMetric(metrics.competitors_monitored)} | Fontes: ${formatLinksMarkdown(metrics.evidence.byKpi.competitors_monitored)} |`);
  lines.push(`| Fontes analisadas | ${fmtMetric(metrics.sources_analyzed_count)} | Fontes: ${formatLinksMarkdown(metrics.evidence.byKpi.sources_analyzed_count)} |`);
  lines.push(`| Eventos 7d total | ${fmtMetric(metrics.events_7d_total)} | ${fmtDelta(metrics.delta_vs_last_week)} / Fontes: ${formatLinksMarkdown(metrics.evidence.byKpi.events_7d_total)} |`);
  lines.push(`| Mudanças no site 7d | ${fmtMetric(metrics.site_changes_7d)} | Fontes: ${formatLinksMarkdown(metrics.evidence.byKpi.site_changes_7d)} |`);
  lines.push(`| Posts sociais 7d | ${fmtMetric(metrics.social_posts_7d)} | Fontes: ${formatLinksMarkdown(metrics.evidence.byKpi.social_posts_7d)} |`);
  lines.push(`| Vídeos no YouTube 7d | ${fmtMetric(metrics.youtube_videos_7d)} | Fontes: ${formatLinksMarkdown(metrics.evidence.byKpi.youtube_videos_7d)} |`);
  lines.push(`| Menções em notícias 7d | ${fmtMetric(metrics.news_mentions_7d)} | Fontes: ${formatLinksMarkdown(metrics.evidence.byKpi.news_mentions_7d)} |`);
  lines.push(`| Bids 7d | ${fmtMetric(metrics.bids_7d)} | Fontes: ${formatLinksMarkdown(metrics.evidence.byKpi.bids_7d)} |`);
  lines.push(`| Vencedores detectados | ${fmtMetric(metrics.winners_detected)} | Fontes: ${formatLinksMarkdown(metrics.evidence.byKpi.winners_detected)} |`);
  lines.push("");
  lines.push("## Top 5 Movimentos");
  metrics.evidence.topMovements.forEach(({ event, evidence }, index) => {
    const links = formatLinksMarkdown(evidence);
    lines.push(`${index + 1}. **${event.competitor}** - ${summarizeFact(event)}`);
    lines.push(`   - ${event.summary}`);
    lines.push(`   - ${links}`);
  });
  lines.push("");
  lines.push("## Heatmap por Produto");
  metrics.evidence.impactByProduct.slice(0, 10).forEach((row, index) => {
    const delta = row.delta ?? 0;
    lines.push(`${index + 1}. **${row.product}** - ${row.count} eventos (${delta >= 0 ? "+" : ""}${delta})`);
    lines.push(`   - ${formatLinksMarkdown(row.evidence)}`);
  });
  lines.push("");
  lines.push("## Público vs Privado");
  lines.push(`### Público (${publicEvents.length})`);
  if (publicEvents.length) {
    publicEvents.slice(0, 5).forEach((event) => lines.push(`- ${event.competitor}: ${event.summary}`));
  } else {
    lines.push("- —");
  }
  lines.push(`### Privado (${privateEvents.length})`);
  if (privateEvents.length) {
    privateEvents.slice(0, 5).forEach((event) => lines.push(`- ${event.competitor}: ${event.summary}`));
  } else {
    lines.push("- —");
  }
  lines.push("");
  lines.push("## Ações recomendadas");
  lines.push("- Produto: revisar roadmap nos produtos com maior variação.");
  lines.push("- Comercial Público: acompanhar sinais de bids, winners e movimentações de edital.");
  lines.push("- Comercial Privado: priorizar concorrentes com maior atividade e impacto.");
  lines.push("- Marketing: ajustar mensagem para os temas mais recorrentes da semana.");
  lines.push("- Operações: manter monitoramento de fontes com baixa confiança para confirmar tendências.");
  return lines.join("\n");
}
