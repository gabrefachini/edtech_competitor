"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Shell } from "../../../components/ui";
import { TopNav } from "../../../components/nav";
import type { CompetitorItem } from "../../../lib/types";

export default function NewCompetitorPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [scope, setScope] = useState<CompetitorItem["scope"]>("competes_market");
  const [regions, setRegions] = useState("BR");
  const [markets, setMarkets] = useState("private");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSave() {
    if (!name.trim() || !website.trim()) {
      setError("Preencha nome e website.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          website: website.trim(),
          scope,
          regions: regions.split(",").map((item) => item.trim()).filter(Boolean),
          markets: markets.split(",").map((item) => item.trim()).filter(Boolean),
          tags: tags.split(",").map((item) => item.trim()).filter(Boolean)
        })
      });
      if (!res.ok) throw new Error("Nao foi possivel salvar o concorrente.");
      router.push("/competitors");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel salvar o concorrente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <TopNav />
      <Shell
        title="Adicionar concorrente"
        subtitle="Crie um concorrente novo com nome + site e ele entra na lista imediatamente"
        actions={<Badge tone="info">competitors.yaml</Badge>}
      >
        <Card className="max-w-3xl p-6">
          {error ? <div className="mb-5 rounded-2xl border border-critical bg-[#ffdad5] p-4 text-sm text-critical">{error}</div> : null}
          <div className="mb-5 rounded-2xl border border-outline bg-surface2/70 p-4 text-sm text-muted">
            O formulario abaixo segue o mesmo padrao de campos usado em toda a aplicacao.
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
              <div className="mb-1 text-muted">Regioes</div>
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
            <Button onClick={onSave} disabled={saving}>{saving ? "Salvando..." : "Salvar concorrente"}</Button>
            <Button variant="ghost" href="/competitors">Cancelar</Button>
          </div>
        </Card>
      </Shell>
    </div>
  );
}
