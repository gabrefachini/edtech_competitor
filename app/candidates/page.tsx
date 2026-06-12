"use client";

import { useState } from "react";
import { Badge, Button, Card, Shell } from "../../components/ui";
import { TopNav } from "../../components/nav";
import { candidates as seedCandidates } from "../../lib/mockData";
import type { CandidateItem } from "../../lib/types";

export default function CandidatesPage() {
  const [items, setItems] = useState<CandidateItem[]>(seedCandidates);
  const [approved, setApproved] = useState(0);
  const [rejected, setRejected] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [rowLoading, setRowLoading] = useState<Record<string, boolean>>({});

  async function approveCandidate(candidate: CandidateItem) {
    setRowLoading((current) => ({ ...current, [candidate.id]: true }));
    setMessage(null);
    try {
      const res = await fetch("/api/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: candidate.name,
          website: candidate.website,
          scope: "benchmark_global",
          regions: ["GLOBAL"],
          markets: ["private"],
          tags: ["candidate:approved"],
          impacted_products: candidate.products
        })
      });
      if (!res.ok) throw new Error("Nao foi possivel aprovar o candidato.");
      setItems((current) => current.filter((item) => item.id !== candidate.id));
      setApproved((value) => value + 1);
      setMessage(`${candidate.name} foi adicionado a lista de concorrentes.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Nao foi possivel aprovar o candidato.");
    } finally {
      setRowLoading((current) => ({ ...current, [candidate.id]: false }));
    }
  }

  function rejectCandidate(candidate: CandidateItem) {
    setItems((current) => current.filter((item) => item.id !== candidate.id));
    setRejected((value) => value + 1);
    setMessage(`${candidate.name} foi removido da fila.`);
  }

  return (
    <div>
      <TopNav />
      <Shell title="Candidatos" subtitle="Prospects sugeridos com base nos sinais recentes" actions={<Badge tone="info">{items.length} em fila</Badge>}>
        {message ? <div className="mb-4 rounded-2xl border border-outline bg-surface2 px-4 py-3 text-sm text-muted">{message}</div> : null}
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <Card className="p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-muted">Total</div>
            <div className="mt-2 text-2xl font-semibold">{items.length}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-muted">Aprovados</div>
            <div className="mt-2 text-2xl font-semibold">{approved}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-muted">Rejeitados</div>
            <div className="mt-2 text-2xl font-semibold">{rejected}</div>
          </Card>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.length ? (
            items.map((candidate) => {
              const busy = Boolean(rowLoading[candidate.id]);
              return (
                <Card key={candidate.id} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold">{candidate.name}</h2>
                      <a className="text-sm text-primary" href={candidate.website}>
                        {candidate.website}
                      </a>
                    </div>
                    <Badge tone="info">{candidate.score}</Badge>
                  </div>
                  <p className="mt-3 text-sm text-muted">{candidate.reason}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {candidate.products.map((product) => (
                      <Badge key={product}>{product}</Badge>
                    ))}
                  </div>
                  <div className="mt-5 flex gap-2">
                    <Button variant="secondary" onClick={() => approveCandidate(candidate)} disabled={busy}>
                      {busy ? "Salvando..." : "Aprovar"}
                    </Button>
                    <Button onClick={() => rejectCandidate(candidate)} disabled={busy}>Rejeitar</Button>
                  </div>
                </Card>
              );
            })
          ) : (
            <Card className="p-5 text-sm text-muted">Nenhum candidato pendente.</Card>
          )}
        </div>
      </Shell>
    </div>
  );
}
