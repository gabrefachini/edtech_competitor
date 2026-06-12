"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge, Button, Card, Shell } from "../../components/ui";
import { TopNav } from "../../components/nav";
import type { CompetitorItem } from "../../lib/types";

type CompetitorResponse = {
  competitors: CompetitorItem[];
  total: number;
  health?: Record<string, unknown>;
};

const marketLabels: Record<string, string> = { public: "Publico", private: "Privado" };
const scopeLabels: Record<string, string> = {
  competes_market: "Concorrente (mercado)",
  benchmark_global: "Benchmark global"
};

function formatDateTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("pt-BR");
}

function coverageTone(value?: number) {
  if ((value ?? 0) >= 70) return "success";
  if ((value ?? 0) >= 40) return "warning";
  return "critical";
}

export default function CompetitorsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<CompetitorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rowLoading, setRowLoading] = useState<Record<string, { run?: boolean; toggle?: boolean }>>({});

  const queryString = useMemo(() => searchParams?.toString() ?? "", [searchParams]);

  async function loadRows() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/competitors${queryString ? `?${queryString}` : ""}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Falha ao carregar concorrentes.");
      const data = (await res.json()) as CompetitorResponse;
      setRows(data.competitors);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar concorrentes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  async function refreshAfterMutation() {
    await loadRows();
    router.refresh();
  }

  async function runNow(id: string) {
    setRowLoading((current) => ({ ...current, [id]: { ...(current[id] ?? {}), run: true } }));
    setError(null);
    try {
      const res = await fetch(`/api/competitors/${id}/run`, { method: "POST" });
      if (!res.ok) throw new Error("Nao foi possivel rodar agora.");
      await refreshAfterMutation();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel rodar agora.");
    } finally {
      setRowLoading((current) => ({ ...current, [id]: { ...(current[id] ?? {}), run: false } }));
    }
  }

  async function toggleStatus(id: string, status: CompetitorItem["status"]) {
    setRowLoading((current) => ({ ...current, [id]: { ...(current[id] ?? {}), toggle: true } }));
    setError(null);
    try {
      const res = await fetch(`/api/competitors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error("Nao foi possivel atualizar o status.");
      await refreshAfterMutation();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel atualizar o status.");
    } finally {
      setRowLoading((current) => ({ ...current, [id]: { ...(current[id] ?? {}), toggle: false } }));
    }
  }

  const filterValues = useMemo(() => {
    const unique = (getter: (item: CompetitorItem) => string[]) => [...new Set(rows.flatMap(getter))].filter(Boolean);
    return {
      regions: unique((item) => item.regions),
      markets: unique((item) => item.markets),
      scopes: unique((item) => [item.scope]),
      tags: unique((item) => item.tags),
      statuses: unique((item) => [item.status])
    };
  }, [rows]);

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(queryString);
    if (!value || value === "all") params.delete(key);
    else params.set(key, value);
    router.push(`/competitors${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <div>
      <TopNav />
      <Shell
        title="Concorrentes"
        subtitle="Fonte unica: YAML persistido com filtros, cobertura e acoes em tempo real"
        actions={<Button href="/competitors/new">Adicionar concorrente</Button>}
      >
        <Card className="p-5">
          <div className="grid gap-3 md:grid-cols-5">
            <label className="text-sm">
              <div className="mb-1 text-muted">regiao</div>
              <select value={searchParams.get("region") ?? "all"} onChange={(e) => setFilter("region", e.target.value)} className="focus-ring w-full rounded-2xl border border-outline bg-white px-3 py-2">
                <option value="all">Todos</option>
                {filterValues.regions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <div className="mb-1 text-muted">mercado</div>
              <select value={searchParams.get("market") ?? "all"} onChange={(e) => setFilter("market", e.target.value)} className="focus-ring w-full rounded-2xl border border-outline bg-white px-3 py-2">
                <option value="all">Todos</option>
                {filterValues.markets.map((item) => (
                  <option key={item} value={item}>
                    {marketLabels[item] ?? item}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <div className="mb-1 text-muted">escopo</div>
              <select value={searchParams.get("scope") ?? "all"} onChange={(e) => setFilter("scope", e.target.value)} className="focus-ring w-full rounded-2xl border border-outline bg-white px-3 py-2">
                <option value="all">Todos</option>
                {filterValues.scopes.map((item) => (
                  <option key={item} value={item}>
                    {scopeLabels[item] ?? item}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <div className="mb-1 text-muted">tags</div>
              <select value={searchParams.get("tag") ?? "all"} onChange={(e) => setFilter("tag", e.target.value)} className="focus-ring w-full rounded-2xl border border-outline bg-white px-3 py-2">
                <option value="all">Todos</option>
                {filterValues.tags.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <div className="mb-1 text-muted">status</div>
              <select value={searchParams.get("status") ?? "all"} onChange={(e) => setFilter("status", e.target.value)} className="focus-ring w-full rounded-2xl border border-outline bg-white px-3 py-2">
                <option value="all">Todos</option>
                {filterValues.statuses.map((item) => (
                  <option key={item} value={item}>
                    {item === "active" ? "Ativo" : "Pausado"}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </Card>

        {error ? <p className="mt-4 rounded-2xl border border-critical bg-[#ffdad5] px-4 py-3 text-sm text-critical">{error}</p> : null}

        <Card className="mt-6 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[1460px] table-fixed text-left text-sm">
              <thead className="bg-surface2 text-muted">
                <tr>
                  {["name", "website", "scope", "regions", "markets", "last_run", "events_7d", "coverage", "impacted_products", "actions"].map((col) => (
                    <th key={col} className="px-4 py-3 font-medium capitalize">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-4 py-4 text-muted" colSpan={10}>
                      Carregando...
                    </td>
                  </tr>
                ) : rows.length ? (
                  rows.map((row) => {
                    const isRunning = rowLoading[row.id]?.run;
                    const isToggling = rowLoading[row.id]?.toggle;
                    return (
                      <tr key={row.id} className="border-t border-outline">
                        <td className="px-4 py-4 font-medium align-top">
                          <div>{row.name}</div>
                          <div className="mt-1 text-xs text-muted">{row.status === "active" ? "Ativo" : "Pausado"}</div>
                        </td>
                        <td className="px-4 py-4 align-top text-primary">{row.website}</td>
                        <td className="px-4 py-4 align-top">{scopeLabels[row.scope] ?? row.scope}</td>
                        <td className="px-4 py-4 align-top">{row.regions.join(", ")}</td>
                        <td className="px-4 py-4 align-top">{row.markets.map((market) => marketLabels[market] ?? market).join(", ")}</td>
                        <td className="px-4 py-4 align-top" title={`website: ${formatDateTime(row.source_last_collected?.website ?? null)}\nnews: ${formatDateTime(row.source_last_collected?.news ?? null)}\nsocial: ${formatDateTime(row.source_last_collected?.social ?? null)}\nyoutube: ${formatDateTime(row.source_last_collected?.youtube ?? null)}`}>
                          {formatDateTime(row.last_run)}
                        </td>
                        <td className="px-4 py-4 align-top">{row.events_7d}</td>
                        <td className="px-4 py-4 align-top">
                          <Badge tone={coverageTone(row.coverage_score) as "neutral" | "info" | "success" | "warning" | "critical"} title={`coverage_score ${row.coverage_score ?? 0}`}>
                            {row.coverage_score ?? 0}%
                          </Badge>
                        </td>
                        <td className="px-4 py-4 align-top">{row.impacted_products.join(", ") || "-"}</td>
                        <td className="px-4 py-4 align-top">
                          <div className="flex flex-wrap gap-2">
                            <Button variant="ghost" href={`/competitors/${row.id}`}>
                              Ver
                            </Button>
                            <Button variant="secondary" onClick={() => runNow(row.id)} disabled={row.status === "paused" || Boolean(isRunning)}>
                              {isRunning ? "Rodando..." : "Rodar agora"}
                            </Button>
                            <Button onClick={() => toggleStatus(row.id, row.status === "active" ? "paused" : "active")}>
                              {isToggling ? "Salvando..." : row.status === "active" ? "Pausar" : "Ativar"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="px-4 py-4 text-muted" colSpan={10}>
                      Nenhum concorrente encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </Shell>
    </div>
  );
}
