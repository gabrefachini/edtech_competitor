"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Badge, Card, Shell } from "../../../components/ui";
import { TopNav } from "../../../components/nav";
import type { CompetitorItem } from "../../../lib/types";

type ApiResponse = { competitor: CompetitorItem };

const marketLabels: Record<string, string> = { public: "Público", private: "Privado" };
const scopeLabels: Record<string, string> = {
  competes_market: "Concorrente (mercado)",
  benchmark_global: "Benchmark global"
};

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("pt-BR");
}

export default function CompetitorDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [competitor, setCompetitor] = useState<CompetitorItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setLoading(true);
    fetch(`/api/competitors/${id}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Concorrente não encontrado.");
        return (await res.json()) as ApiResponse;
      })
      .then((data) => {
        if (mounted) setCompetitor(data.competitor);
      })
      .catch((err) => {
        if (mounted) setError(err instanceof Error ? err.message : "Concorrente não encontrado.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [id]);

  const title = competitor?.name ?? id ?? "Concorrente";
  const subtitle = useMemo(
    () => (competitor ? `${scopeLabels[competitor.scope] ?? competitor.scope} • ${competitor.regions.join(", ")} • ${competitor.markets.map((market) => marketLabels[market] ?? market).join(", ")}` : "Detalhe do concorrente"),
    [competitor]
  );

  return (
    <div>
      <TopNav />
      <Shell title={title} subtitle={subtitle}>
        {loading ? (
          <Card className="p-5 text-sm text-muted">Carregando...</Card>
        ) : error ? (
          <Card className="p-5 text-sm text-critical">{error}</Card>
        ) : competitor ? (
          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="p-5">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Badge tone="info">{scopeLabels[competitor.scope] ?? competitor.scope}</Badge>
                <Badge>{competitor.status === "active" ? "Ativo" : "Pausado"}</Badge>
                {competitor.tags.map((tag) => (
                  <Badge key={tag}>{tag}</Badge>
                ))}
              </div>
              <div className="grid gap-3 text-sm md:grid-cols-2">
                <div className="rounded-2xl border border-outline bg-white p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-muted">Website</div>
                  <a className="mt-2 block break-all text-primary hover:underline" href={competitor.website}>{competitor.website}</a>
                </div>
                <div className="rounded-2xl border border-outline bg-white p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-muted">Última execução</div>
                  <div className="mt-2 font-medium">{formatDateTime(competitor.last_run)}</div>
                </div>
                <div className="rounded-2xl border border-outline bg-white p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-muted">Regiões</div>
                  <div className="mt-2 font-medium">{competitor.regions.join(", ")}</div>
                </div>
                <div className="rounded-2xl border border-outline bg-white p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-muted">Mercados</div>
                  <div className="mt-2 font-medium">{competitor.markets.map((market) => marketLabels[market] ?? market).join(", ")}</div>
                </div>
                <div className="rounded-2xl border border-outline bg-white p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-muted">Eventos 7d</div>
                  <div className="mt-2 text-2xl font-semibold text-text">{competitor.events_7d}</div>
                </div>
                <div className="rounded-2xl border border-outline bg-white p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-muted">Produtos impactados</div>
                  <div className="mt-2 font-medium">{competitor.impacted_products.join(", ") || "—"}</div>
                </div>
              </div>
            </Card>
            <div className="space-y-6">
              <Card className="p-5">
                <h2 className="text-lg font-semibold">Linha do tempo</h2>
                <p className="mt-2 text-sm text-muted">Os eventos passam a vir do histórico do digest quando disponíveis. Este detalhe já está amarrado ao competitor certo via `id`.</p>
                <div className="mt-4 rounded-2xl border border-dashed border-outline bg-surface2/70 p-4 text-sm text-muted">
                  Timeline e diffs entrarão aqui quando o histórico do digest estiver populado.
                </div>
              </Card>
              <Card className="p-5">
                <h2 className="text-lg font-semibold">Mini-FOFA</h2>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted">
                  <li>Foco recente em integrações e distribuição.</li>
                  <li>Movimento de mensagem para adoção/engajamento.</li>
                  <li>Possível revisão de posicionamento no funil.</li>
                </ul>
              </Card>
            </div>
          </section>
        ) : null}
      </Shell>
    </div>
  );
}
