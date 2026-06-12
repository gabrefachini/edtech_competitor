"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Shell } from "../../components/ui";
import { TopNav } from "../../components/nav";
import type { EventItem } from "../../lib/types";
import type { ExecutiveMetrics } from "../../lib/reportMetrics";

type ReportsResponse = {
  report: { date: string; title: string; markdown: string; html: string } | null;
  metrics: ExecutiveMetrics & {
    evidence: {
      byKpi: Record<string, Array<{ url: string; title?: string; type?: string }>>;
      topMovements: Array<{ event: EventItem; evidence: Array<{ url: string; title?: string; type?: string }> }>;
      impactByProduct: Array<{ product: string; count: number; delta: number | null; evidence: Array<{ url: string; title?: string; type?: string }> }>;
    };
  };
  health: unknown;
  events: EventItem[];
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

function formatLinks(links: Array<{ url: string; title?: string }>) {
  return links.map((link) => `[${link.title || new URL(link.url).hostname.replace(/^www\./, "")}](${link.url})`).join(", ");
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportsResponse | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  async function loadReport() {
    return fetch("/api/reports/latest", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Falha ao carregar o relatorio.");
        return (await res.json()) as ReportsResponse;
      })
      .then((payload) => {
        setData(payload);
        return payload;
      });
  }

  useEffect(() => {
    loadReport().catch((err) => setMessage(err instanceof Error ? err.message : "Falha ao carregar o relatorio."));
  }, []);

  const report = data?.report;
  const metrics = data?.metrics;

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(report?.markdown ?? "");
      setMessage("E-mail copiado para a area de transferencia.");
    } catch {
      setMessage("Nao foi possivel copiar automaticamente.");
    }
  }

  function downloadFile(content: string, filename: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setMessage(`Arquivo exportado: ${filename}`);
  }

  function openReportPreview() {
    if (!report) return;
    const blob = new Blob([report.html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function generateNow() {
    setIsGenerating(true);
    setMessage(null);
    try {
      const res = await fetch("/api/digest/run", { method: "POST" });
      if (!res.ok) throw new Error("Nao foi possivel gerar o relatorio semanal.");
      await loadReport();
      setMessage("Relatorio semanal atualizado.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Nao foi possivel gerar o relatorio semanal.");
    } finally {
      setIsGenerating(false);
    }
  }

  const topMovements = useMemo(() => data?.metrics.evidence.topMovements ?? [], [data]);
  const productRanking = useMemo(() => data?.metrics.impact_by_product ?? [], [data]);

  return (
    <div>
      <TopNav />
      <Shell
        title="Relatorios"
        subtitle="Relatorio semanal com metricas, citacoes e exportacao Markdown + HTML"
        actions={
          <>
            <Button onClick={generateNow} disabled={isGenerating}>{isGenerating ? "Gerando..." : "Gerar agora"}</Button>
            <Button variant="ghost" onClick={copyEmail} disabled={!report}>Copiar e-mail</Button>
            <Button variant="secondary" onClick={() => report && downloadFile(report.markdown, `${report.date}.md`, "text/markdown;charset=utf-8")} disabled={!report}>
              Exportar MD
            </Button>
            <Button onClick={() => report && downloadFile(report.html, `${report.date}.html`, "text/html;charset=utf-8")} disabled={!report}>
              Exportar HTML
            </Button>
          </>
        }
      >
        {message ? <p className="mb-4 rounded-2xl border border-outline bg-surface2 px-4 py-3 text-sm text-muted">{message}</p> : null}
        <section className="grid gap-6 xl:grid-cols-[0.55fr_1fr]">
          <Card className="p-5">
            <h2 className="text-lg font-semibold">Ultimo relatorio</h2>
            <div className="mt-4 space-y-3">
              <button type="button" onClick={openReportPreview} className="focus-ring w-full rounded-2xl border border-primary bg-white px-4 py-4 text-left shadow-sm" disabled={!report}>
                <div className="flex items-center justify-between">
                  <span className="font-medium">{report?.title ?? "Carregando..."}</span>
                  <Badge tone="info">{report?.date ?? "-"}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted">Exportacao Markdown + HTML com citacoes.</p>
              </button>
              <div className="rounded-2xl border border-outline bg-surface2 p-4 text-sm text-muted">
                Eventos carregados: <strong>{data?.events.length ?? 0}</strong>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Resumo Executivo</h2>
                <p className="text-sm text-muted">Metricas reais do job semanal com fontes anexadas.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={generateNow} disabled={isGenerating}>{isGenerating ? "Gerando..." : "Gerar agora"}</Button>
                <Button variant="ghost" onClick={copyEmail} disabled={!report}>Copiar e-mail</Button>
                <Button variant="secondary" onClick={() => report && downloadFile(report.markdown, `${report.date}.md`, "text/markdown;charset=utf-8")} disabled={!report}>
                  Exportar MD
                </Button>
                <Button onClick={() => report && downloadFile(report.html, `${report.date}.html`, "text/html;charset=utf-8")} disabled={!report}>
                  Exportar HTML
                </Button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="competitors_monitored" value={String(metrics?.competitors_monitored ?? 0)} />
              <MetricCard label="sources_analyzed_count" value={String(metrics?.sources_analyzed_count ?? 0)} />
              <MetricCard label="events_7d_total" value={String(metrics?.events_7d_total ?? 0)} delta={metrics?.delta_vs_last_week ? `${metrics.delta_vs_last_week > 0 ? "+" : ""}${metrics.delta_vs_last_week}%` : undefined} />
              <MetricCard label="site_changes_7d" value={String(metrics?.site_changes_7d ?? 0)} />
              <MetricCard label="social_posts_7d" value={String(metrics?.social_posts_7d ?? 0)} />
              <MetricCard label="youtube_videos_7d" value={String(metrics?.youtube_videos_7d ?? 0)} />
              <MetricCard label="news_mentions_7d" value={String(metrics?.news_mentions_7d ?? 0)} />
              <MetricCard label="bids_7d" value={String(metrics?.bids_7d ?? 0)} />
            </div>

            <article className="mt-4 space-y-6 rounded-[1.25rem] border border-outline bg-surface2 p-5">
              <section>
                <h3 className="text-base font-semibold">Placar da Semana</h3>
                <div className="mt-3 grid gap-2 text-sm">
                  <div>Concorrentes monitorados: <strong>{metrics?.competitors_monitored ?? 0}</strong></div>
                  <div>Fontes analisadas: <strong>{metrics?.sources_analyzed_count ?? 0}</strong></div>
                  <div>Eventos 7d total: <strong>{metrics?.events_7d_total ?? 0}</strong></div>
                  <div>Mudancas no site 7d: <strong>{metrics?.site_changes_7d ?? 0}</strong></div>
                  <div>Posts sociais 7d: <strong>{metrics?.social_posts_7d ?? 0}</strong></div>
                  <div>Videos no YouTube 7d: <strong>{metrics?.youtube_videos_7d ?? 0}</strong></div>
                  <div>Menções em noticias 7d: <strong>{metrics?.news_mentions_7d ?? 0}</strong></div>
                  <div>Bids 7d: <strong>{metrics?.bids_7d ?? 0}</strong></div>
                  <div>Vencedores detectados: <strong>{metrics?.winners_detected ?? 0}</strong></div>
                </div>
              </section>

              <section>
                <h3 className="text-base font-semibold">Top 5 Movimentos</h3>
                <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm text-text">
                  {topMovements.map(({ event, evidence }, index) => (
                    <li key={`${event.id}-${index}`}>
                      <div className="font-medium">{event.competitor} - {event.title}</div>
                      <div>{event.summary}</div>
                      <div className="mt-1 text-muted">{formatLinks(evidence)}</div>
                    </li>
                  ))}
                </ol>
              </section>

              <section>
                <h3 className="text-base font-semibold">Impacto por Produto</h3>
                <div className="mt-3 space-y-2 text-sm">
                  {productRanking.slice(0, 10).map((row, index) => (
                    <div key={row.product} className="flex items-center justify-between rounded-2xl border border-outline bg-white px-4 py-3">
                      <span>{index + 1}. {row.product}</span>
                      <span className="font-medium text-primary">
                        {row.count} {(row.delta ?? 0) >= 0 ? `(+${row.delta ?? 0})` : `(${row.delta ?? 0})`}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-base font-semibold">Preview do Markdown</h3>
                <pre className="mt-2 max-h-[24rem] overflow-auto rounded-2xl bg-white p-4 text-xs leading-5 text-text">{report?.markdown ?? "Carregando..."}</pre>
              </section>
            </article>
          </Card>
        </section>
      </Shell>
    </div>
  );
}
