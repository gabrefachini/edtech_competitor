"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Shell } from "../../components/ui";
import { TopNav } from "../../components/nav";
import type { CompetitorItem, EventItem } from "../../lib/types";
import type { ExecutiveMetrics } from "../../lib/reportMetrics";

type DashboardResponse = {
  metrics: ExecutiveMetrics & {
    evidence: {
      byKpi: Record<string, Array<{ url: string; title?: string; type?: string }>>;
      topMovements: Array<{ event: EventItem; evidence: Array<{ url: string; title?: string; type?: string }> }>;
      impactByProduct: Array<{ product: string; count: number; delta: number | null; evidence: Array<{ url: string; title?: string; type?: string }> }>;
    };
  };
  events: EventItem[];
  competitors: Array<CompetitorItem & { coverage_score?: number; source_status?: Record<string, string>; source_last_collected?: Record<string, string | null> }>;
  health: {
    summary: {
      average_coverage: number;
      ok_sources: number;
      blocked_sources: number;
      empty_sources: number;
      rate_limited_sources: number;
    };
  } | null;
  report: { date: string; title: string; markdown: string; html: string } | null;
};

function MetricCard({ label, value, delta }: { label: string; value: string; delta?: string }) {
  return (
    <div className="rounded-2xl border border-outline bg-surface2 p-4">
      <div className="text-xs uppercase tracking-[0.18em] text-muted">{label}</div>
      <div className="mt-2 flex items-end justify-between gap-4">
        <div className="text-2xl font-semibold text-text">{value}</div>
        {delta ? <div className="text-sm font-medium text-primary">{delta}</div> : <div className="text-sm text-muted">-</div>}
      </div>
    </div>
  );
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("pt-BR");
}

function statusTone(status?: string) {
  if (status === "ok") return "success";
  if (status === "blocked" || status === "http_error" || status === "rate_limited") return "critical";
  return "warning";
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  async function loadDashboard() {
    return fetch("/api/dashboard", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Falha ao carregar o dashboard.");
        return (await res.json()) as DashboardResponse;
      });
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadDashboard()
      .then((payload) => {
        if (active) setData(payload);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Falha ao carregar o dashboard.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function runNow() {
    setIsRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/digest/run", { method: "POST" });
      if (!res.ok) throw new Error("Nao foi possivel rodar a coleta semanal.");
      setData(await loadDashboard());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel rodar a coleta semanal.");
    } finally {
      setIsRunning(false);
    }
  }

  const topEvents = useMemo(() => data?.events ?? [], [data]);
  const productRanking = useMemo(() => data?.metrics.impact_by_product ?? [], [data]);
  const metrics = data?.metrics;

  return (
    <div>
      <TopNav />
      <Shell
        title="Painel"
        subtitle="Visao semanal da inteligencia competitiva com coleta real, cobertura e citacoes"
        actions={
          <>
            <Button href="/competitors/new" variant="ghost">Adicionar concorrente</Button>
            <Button variant="secondary" onClick={runNow} disabled={isRunning}>{isRunning ? "Rodando..." : "Rodar agora"}</Button>
            <Button href="/reports">Gerar e-mail semanal</Button>
          </>
        }
      >
        {error ? <p className="mb-4 rounded-2xl border border-critical bg-[#ffdad5] px-4 py-3 text-sm text-critical">{error}</p> : null}
        {loading ? <div className="rounded-2xl border border-outline bg-surface2 p-5 text-sm text-muted">Carregando...</div> : null}

        <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <MetricCard label="competitors_monitored" value={String(metrics?.competitors_monitored ?? 0)} />
          <MetricCard label="sources_analyzed_count" value={String(metrics?.sources_analyzed_count ?? 0)} />
          <MetricCard label="events_7d_total" value={String(metrics?.events_7d_total ?? 0)} />
          <MetricCard label="coverage_avg" value={`${data?.health?.summary.average_coverage ?? 0}%`} />
          <MetricCard label="news_mentions_7d" value={String(metrics?.news_mentions_7d ?? 0)} />
          <MetricCard label="social_posts_7d" value={String(metrics?.social_posts_7d ?? 0)} />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Health por concorrente</h2>
                <p className="text-sm text-muted">Coverage score e ultima coleta por fonte.</p>
              </div>
              <Badge tone="info">avg {data?.health?.summary.average_coverage ?? 0}%</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[1100px] table-fixed text-left text-sm">
                <thead className="bg-surface2 text-muted">
                  <tr>
                    {["concorrente", "coverage", "website", "news", "social", "youtube", "ultima coleta"].map((column) => (
                      <th key={column} className="px-4 py-3 font-medium capitalize">{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data?.competitors ?? []).slice(0, 12).map((competitor) => (
                    <tr key={competitor.id} className="border-t border-outline">
                      <td className="px-4 py-4 font-medium">
                        <div>{competitor.name}</div>
                        <div className="mt-1 text-xs text-muted">{competitor.website}</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="rounded-full bg-surface2 px-2.5 py-1 text-xs font-semibold" title={`coverage_score: ${competitor.coverage_score ?? 0}`}>{competitor.coverage_score ?? 0}%</span>
                      </td>
                      {["website", "news", "social", "youtube"].map((source) => (
                        <td key={source} className="px-4 py-4">
                          <Badge tone={statusTone(competitor.source_status?.[source]) as never} title={`${source}: ${competitor.source_status?.[source] ?? "empty"}\nlast: ${formatDateTime(competitor.source_last_collected?.[source] ?? null)}`}>
                            {competitor.source_status?.[source] ?? "empty"}
                          </Badge>
                        </td>
                      ))}
                      <td className="px-4 py-4 text-muted">{formatDateTime(competitor.last_run)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Impacto por produto</h2>
              <Badge tone="neutral">ranking</Badge>
            </div>
            <div className="space-y-3">
              {productRanking.map((row, index) => (
                <div key={row.product} className="flex items-center gap-3">
                  <div className="w-8 text-sm font-semibold text-muted">{index + 1}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate font-medium">{row.product}</span>
                      <span className="text-muted">{row.count}</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-surface3 ring-1 ring-inset ring-outline/50">
                      <div className="h-2 rounded-full bg-gradient-to-r from-primary to-secondary" style={{ width: `${Math.min(100, row.count * 8)}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Top 10 eventos</h2>
              <Badge tone="info">7d</Badge>
            </div>
            <div className="space-y-3">
              {topEvents.map((event) => (
                <article key={event.id} className="rounded-2xl border border-outline/80 bg-surface2/70 p-4 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong>{event.competitor}</strong>
                    <Badge>{event.type}</Badge>
                    <Badge tone={event.confidence === "high" ? "success" : event.confidence === "med" ? "warning" : "neutral"}>{event.confidence}</Badge>
                    <span className="text-sm text-muted">{event.source}</span>
                  </div>
                  <p className="mt-2 text-sm text-text">{event.summary}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <a className="text-sm font-medium text-primary hover:underline" href={event.url}>
                      Abrir fonte
                    </a>
                    {event.evidence_urls?.length ? <span className="text-xs text-muted">{event.evidence_urls.length} evidence links</span> : null}
                  </div>
                </article>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Sinais de saude</h2>
              <Badge tone="neutral">status</Badge>
            </div>
            <div className="space-y-3 text-sm">
              <div className="rounded-2xl border border-outline bg-white p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-muted">Coverage medio</div>
                <div className="mt-2 text-3xl font-semibold text-text">{data?.health?.summary.average_coverage ?? 0}%</div>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="rounded-2xl border border-outline bg-white p-3">OK: <strong>{data?.health?.summary.ok_sources ?? 0}</strong></div>
                <div className="rounded-2xl border border-outline bg-white p-3">Empty: <strong>{data?.health?.summary.empty_sources ?? 0}</strong></div>
                <div className="rounded-2xl border border-outline bg-white p-3">Blocked: <strong>{data?.health?.summary.blocked_sources ?? 0}</strong></div>
                <div className="rounded-2xl border border-outline bg-white p-3">Rate limited: <strong>{data?.health?.summary.rate_limited_sources ?? 0}</strong></div>
              </div>
              <div className="rounded-2xl border border-dashed border-outline bg-surface2/70 p-4 text-muted">
                Ultimo relatorio: {data?.report?.date ?? "-"}
              </div>
            </div>
          </Card>
        </section>
      </Shell>
    </div>
  );
}
