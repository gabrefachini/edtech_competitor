import { Badge, Button, Card, Shell } from "../../components/ui";
import { TopNav } from "../../components/nav";
import { events, kpis, productRanking } from "../../lib/mockData";

export default function DashboardPage() {
  return (
    <div>
      <TopNav />
      <Shell
        title="Painel"
        subtitle="Visão semanal da inteligência competitiva com fallback mockado de /data"
        actions={
          <>
            <Button href="/competitors/new" variant="ghost">Adicionar concorrente</Button>
            <Button variant="secondary">Rodar agora</Button>
            <Button>Gerar e-mail semanal</Button>
          </>
        }
      >
        <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          {Object.entries(kpis).map(([key, value]) => (
            <Card key={key} className="p-4 transition hover:-translate-y-0.5 hover:shadow-soft">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">{key}</div>
              <div className="mt-2 text-3xl font-semibold text-text">{value}</div>
            </Card>
          ))}
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Top 10 eventos</h2>
              <Badge tone="info">7d</Badge>
            </div>
            <div className="space-y-3">
              {events.map((event) => (
                <article key={event.id} className="rounded-2xl border border-outline/80 bg-surface2/70 p-4 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong>{event.competitor}</strong>
                    <Badge>{event.type}</Badge>
                    <Badge tone={event.confidence === "high" ? "success" : event.confidence === "med" ? "warning" : "neutral"}>{event.confidence}</Badge>
                    <span className="text-sm text-muted">{event.source}</span>
                  </div>
                  <p className="mt-2 text-sm text-text">{event.summary}</p>
                  <a className="mt-2 inline-block text-sm font-medium text-primary hover:underline" href={event.url}>
                    Abrir fonte
                  </a>
                </article>
              ))}
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
      </Shell>
    </div>
  );
}
