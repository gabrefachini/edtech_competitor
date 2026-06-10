"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Card, Shell } from "../../components/ui";
import { TopNav } from "../../components/nav";
import { candidates as seedCandidates } from "../../lib/mockData";
import type { CandidateItem } from "../../lib/types";

export default function CandidatesPage() {
  const [items, setItems] = useState<CandidateItem[]>(seedCandidates);
  const counts = useMemo(() => ({ total: items.length, approved: 0, rejected: 0 }), [items]);

  function moveCandidate(id: string, action: "approve" | "reject") {
    setItems((current) => current.filter((item) => item.id !== id));
    setTimeout(() => {
      // noop: placeholder for future persistence
      console.log(`${action}:${id}`);
    }, 0);
  }

  return (
    <div>
      <TopNav />
      <Shell title="Candidatos" subtitle="Prospects sugeridos com base nos sinais recentes" actions={<Badge tone="info">{counts.total} em fila</Badge>}>
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <Card className="p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-muted">Total</div>
            <div className="mt-2 text-2xl font-semibold">{counts.total}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-muted">Aprovados</div>
            <div className="mt-2 text-2xl font-semibold">{counts.approved}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-muted">Rejeitados</div>
            <div className="mt-2 text-2xl font-semibold">{counts.rejected}</div>
          </Card>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.length ? (
            items.map((candidate) => (
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
                  <Button variant="secondary" onClick={() => moveCandidate(candidate.id, "approve")}>
                    Aprovar
                  </Button>
                  <Button onClick={() => moveCandidate(candidate.id, "reject")}>Rejeitar</Button>
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-5 text-sm text-muted">Nenhum candidato pendente.</Card>
          )}
        </div>
      </Shell>
    </div>
  );
}
