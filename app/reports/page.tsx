"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Card, Shell } from "../../components/ui";
import { TopNav } from "../../components/nav";
import { competitors, events, reports } from "../../lib/mockData";
import { buildWeeklyReportMarkdown, computeExecutiveMetrics, fmtDelta, fmtMetric } from "../../lib/reportMetrics";

function MetricCard({ label, value, delta }: { label: string; value: string; delta?: string }) {
  return (
    <div className="rounded-2xl border border-outline bg-surface2 p-4">
      <div className="text-xs uppercase tracking-[0.18em] text-muted">{label}</div>
      <div className="mt-2 flex items-end justify-between gap-4">
        <div className="text-2xl font-semibold text-text">{value}</div>
        {delta ? <div className="text-sm font-medium text-primary">{delta}</div> : <div className="text-sm text-muted">—</div>}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState(reports[0]);
  const [message, setMessage] = useState<string | null>(null);
  const metrics = useMemo(() => computeExecutiveMetrics(events, events.slice(0, 4), competitors), []);
  const markdown = useMemo(() => buildWeeklyReportMarkdown(events, events.slice(0, 4), competitors), []);

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(markdown);
      setMessage("E-mail copiado para a área de transferência.");
    } catch {
      setMessage("Não foi possível copiar automaticamente.");
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

  return (
    <div>
      <TopNav />
      <Shell
        title="Relatórios"
        subtitle="Relatórios semanais com métricas executivas e preview em Markdown"
        actions={
          <>
            <Button variant="ghost" onClick={copyEmail}>Copiar e-mail</Button>
            <Button variant="secondary" onClick={() => downloadFile(markdown, `${activeReport.date}.md`, "text/markdown;charset=utf-8")}>Exportar MD</Button>
            <Button onClick={() => downloadFile(activeReport.html, `${activeReport.date}.html`, "text/html;charset=utf-8")}>Exportar HTML</Button>
          </>
        }
      >
        {message ? <p className="mb-4 rounded-2xl border border-outline bg-surface2 px-4 py-3 text-sm text-muted">{message}</p> : null}
        <section className="grid gap-6 xl:grid-cols-[0.55fr_1fr]">
          <Card className="p-5">
            <h2 className="text-lg font-semibold">Relatórios semanais</h2>
            <div className="mt-4 space-y-3">
              {reports.map((report) => (
                <button
                  key={report.date}
                  type="button"
                  onClick={() => setActiveReport(report)}
                  className={`focus-ring w-full rounded-2xl border p-4 text-left transition ${activeReport.date === report.date ? "border-primary bg-white shadow-sm" : "border-outline bg-surface2"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{report.title}</span>
                    <Badge tone="info">{report.date}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted">Exportação Markdown + HTML disponível.</p>
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Resumo Executivo</h2>
                <p className="text-sm text-muted">Métricas, deltas e blocos semanais com fallback seguro.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" onClick={copyEmail}>Copiar e-mail</Button>
                <Button variant="secondary" onClick={() => downloadFile(markdown, `${activeReport.date}.md`, "text/markdown;charset=utf-8")}>Exportar MD</Button>
                <Button onClick={() => downloadFile(activeReport.html, `${activeReport.date}.html`, "text/html;charset=utf-8")}>Exportar HTML</Button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="competitors_monitored" value={fmtMetric(metrics.competitors_monitored)} />
              <MetricCard label="sources_analyzed_count" value={fmtMetric(metrics.sources_analyzed_count)} />
              <MetricCard label="events_7d_total" value={fmtMetric(metrics.events_7d_total)} delta={fmtDelta(metrics.delta_vs_last_week)} />
              <MetricCard label="site_changes_7d" value={fmtMetric(metrics.site_changes_7d)} />
              <MetricCard label="social_posts_7d" value={fmtMetric(metrics.social_posts_7d)} />
              <MetricCard label="youtube_videos_7d" value={fmtMetric(metrics.youtube_videos_7d)} />
              <MetricCard label="news_mentions_7d" value={fmtMetric(metrics.news_mentions_7d)} />
              <MetricCard label="bids_7d" value={fmtMetric(metrics.bids_7d)} />
            </div>

            <article className="mt-4 space-y-6 rounded-[1.25rem] border border-outline bg-surface2 p-5">
              <section>
                <h3 className="text-base font-semibold">1) Placar da Semana</h3>
                <div className="mt-3 grid gap-2 text-sm">
                  <div>Concorrentes monitorados: <strong>{fmtMetric(metrics.competitors_monitored)}</strong></div>
                  <div>Fontes analisadas: <strong>{fmtMetric(metrics.sources_analyzed_count)}</strong></div>
                  <div>Eventos 7d total: <strong>{fmtMetric(metrics.events_7d_total)}</strong> ({fmtDelta(metrics.delta_vs_last_week)})</div>
                  <div>Mudanças no site 7d: <strong>{fmtMetric(metrics.site_changes_7d)}</strong></div>
                  <div>Posts sociais 7d: <strong>{fmtMetric(metrics.social_posts_7d)}</strong></div>
                  <div>Vídeos no YouTube 7d: <strong>{fmtMetric(metrics.youtube_videos_7d)}</strong></div>
                  <div>Menções em notícias 7d: <strong>{fmtMetric(metrics.news_mentions_7d)}</strong></div>
                  <div>Bids 7d: <strong>{fmtMetric(metrics.bids_7d)}</strong></div>
                  <div>Vencedores detectados: <strong>{fmtMetric(metrics.winners_detected)}</strong></div>
                </div>
                <div className="mt-4 grid gap-2 md:grid-cols-3 text-sm">
                  <div className="rounded-2xl border border-outline bg-white p-3">High: <strong>{metrics.confidence_distribution.high}</strong></div>
                  <div className="rounded-2xl border border-outline bg-white p-3">Medium: <strong>{metrics.confidence_distribution.medium}</strong></div>
                  <div className="rounded-2xl border border-outline bg-white p-3">Low: <strong>{metrics.confidence_distribution.low}</strong></div>
                </div>
              </section>

              <section>
                <h3 className="text-base font-semibold">2) Top 5 Movimentos</h3>
                <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-text">
                  <li>Clever reforçou pricing e integrações. 3 evidências, impacto em HUB.Educacional.</li>
                  <li>Wonde apareceu em notícia de sincronização de dados. 2 evidências, impacto em HUB.Educacional.</li>
                  <li>Matific publicou foco em engajamento de matemática. 2 evidências, impacto em Aprimora.</li>
                  <li>Robomind atualizou portfólio com micro:bit. 2 evidências, impacto em Robotis e Inventura.</li>
                  <li>NEDU ganhou cobertura em IA conversacional. 2 evidências, impacto em NEDU e HUB.Educacional.</li>
                </ol>
              </section>

              <section>
                <h3 className="text-base font-semibold">3) Heatmap por Produto</h3>
                <div className="mt-3 space-y-2 text-sm">
                  {metrics.impact_by_product.slice(0, 10).map((row, index) => (
                    <div key={row.product} className="flex items-center justify-between rounded-2xl border border-outline bg-white px-4 py-3">
                      <span>
                        {index + 1}. {row.product}
                      </span>
                      <span className="font-medium text-primary">
                        {row.count} {(row.delta ?? 0) >= 0 ? `(+${row.delta ?? 0})` : `(${row.delta ?? 0})`}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <div>
                  <h3 className="text-base font-semibold">4) Público</h3>
                  <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-text">
                    <li>Clever e Google for Education concentraram sinais de integração e produtividade.</li>
                    <li>Wonde reforçou movimento de sincronização de dados com SIS.</li>
                    <li>Há mais tração em ecossistemas, identidade e interoperabilidade.</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-base font-semibold">4) Privado</h3>
                  <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-text">
                    <li>Matific e Robomind sinalizam competição em aprendizagem adaptativa e maker.</li>
                    <li>PlayTable sugere expansão em educação infantil e mesas interativas.</li>
                    <li>O movimento privado está mais fragmentado e oportunístico.</li>
                  </ul>
                </div>
              </section>

              <section>
                <h3 className="text-base font-semibold">5) Ações recomendadas</h3>
                <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-text">
                  <li>Priorizar resposta do HUB aos sinais de integrações e SSO.</li>
                  <li>Revisar mensagens do Aprimora para diferenciação frente a adaptive learning.</li>
                  <li>Acompanhar bids e vencedores quando surgirem novas fontes públicas.</li>
                  <li>Ajustar marketing com foco em interoperabilidade, evidências e prova social.</li>
                  <li>Manter monitoramento de fontes com baixa confiança para confirmar tendências.</li>
                </ul>
              </section>

              <section>
                <h3 className="text-base font-semibold">Preview do Markdown</h3>
                <pre className="mt-2 max-h-[24rem] overflow-auto rounded-2xl bg-white p-4 text-xs leading-5 text-text">{markdown}</pre>
              </section>
            </article>
          </Card>
        </section>
      </Shell>
    </div>
  );
}
