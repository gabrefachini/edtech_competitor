"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Shell } from "../../../components/ui";
import { TopNav } from "../../../components/nav";
import { buildCompetitorId, getStoredCompetitors, saveStoredCompetitors } from "../../../lib/competitorStore";
import type { CompetitorItem } from "../../../lib/types";

export default function NewCompetitorPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [scope, setScope] = useState<CompetitorItem["scope"]>("competes_market");
  const [regions, setRegions] = useState("BR");
  const [markets, setMarkets] = useState("private");
  const [tags, setTags] = useState("");

  const onSave = () => {
    if (!name.trim() || !website.trim()) return;
    const current = getStoredCompetitors();
    const next: CompetitorItem = {
      id: buildCompetitorId(name, website),
      name: name.trim(),
      website: website.trim(),
      scope,
      regions: regions.split(",").map((item) => item.trim()).filter(Boolean),
      markets: markets.split(",").map((item) => item.trim()).filter(Boolean),
      tags: tags.split(",").map((item) => item.trim()).filter(Boolean),
      status: "candidate",
      last_run: "—",
      events_7d: 0,
      impacted_products: []
    };
    saveStoredCompetitors([next, ...current.filter((item) => item.id !== next.id)]);
    router.push("/competitors");
  };

  return (
    <div>
      <TopNav />
      <Shell title="Adicionar concorrente" subtitle="Crie um concorrente novo com nome + site e ele entra na lista imediatamente" actions={<Badge tone="info">localStorage</Badge>}>
        <Card className="max-w-3xl p-6">
          <div className="mb-5 rounded-2xl border border-outline bg-surface2/70 p-4 text-sm text-muted">
            O formulário abaixo segue o mesmo padrão de campos usado em toda a aplicação.
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm md:col-span-1">
              <div className="mb-1 text-muted">Nome</div>
              <input value={name} onChange={(e) => setName(e.target.value)} className="focus-ring w-full rounded-2xl border border-outline bg-white px-3 py-2" placeholder="Novo concorrente" />
            </label>
            <label className="text-sm md:col-span-1">
              <div className="mb-1 text-muted">Website</div>
              <input value={website} onChange={(e) => setWebsite(e.target.value)} className="focus-ring w-full rounded-2xl border border-outline bg-white px-3 py-2" placeholder="https://exemplo.com" />
            </label>
            <label className="text-sm">
              <div className="mb-1 text-muted">Escopo</div>
              <select value={scope} onChange={(e) => setScope(e.target.value as CompetitorItem["scope"])} className="focus-ring w-full rounded-2xl border border-outline bg-white px-3 py-2">
                <option value="competes_market">competes_market</option>
                <option value="benchmark_global">benchmark_global</option>
              </select>
            </label>
            <label className="text-sm">
              <div className="mb-1 text-muted">Regiões</div>
              <input value={regions} onChange={(e) => setRegions(e.target.value)} className="focus-ring w-full rounded-2xl border border-outline bg-white px-3 py-2" placeholder="BR, LATAM, GLOBAL" />
            </label>
            <label className="text-sm">
              <div className="mb-1 text-muted">Mercados</div>
              <input value={markets} onChange={(e) => setMarkets(e.target.value)} className="focus-ring w-full rounded-2xl border border-outline bg-white px-3 py-2" placeholder="public, private" />
            </label>
            <label className="text-sm">
              <div className="mb-1 text-muted">Tags</div>
              <input value={tags} onChange={(e) => setTags(e.target.value)} className="focus-ring w-full rounded-2xl border border-outline bg-white px-3 py-2" placeholder="SSO, maker, BI" />
            </label>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button onClick={onSave}>Salvar concorrente</Button>
            <Button variant="ghost" href="/competitors">Cancelar</Button>
          </div>
        </Card>
      </Shell>
    </div>
  );
}
