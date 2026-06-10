import type { CandidateItem, CompetitorItem, EventItem, ReportItem } from "./types";

export const kpis = {
  competitors_active: 24,
  events_7d: 48,
  site_changes_7d: 18,
  social_mentions_7d: 11,
  news_mentions_7d: 7,
  bids_7d: 4
};

export const events: EventItem[] = [
  {
    id: "evt-001",
    competitor: "Clever",
    type: "website_change",
    source: "/pricing",
    confidence: "high",
    url: "https://clever.com/pricing",
    date: "2026-06-08",
    title: "Pricing update",
    snippet: "Novo texto de pricing enfatiza school district workflows e integrações.",
    summary: "Novo texto de pricing enfatiza school district workflows e integrações.",
    product: ["HUB.Educacional"]
  },
  {
    id: "evt-002",
    competitor: "Wonde",
    type: "news",
    source: "news",
    confidence: "med",
    url: "https://example.com/news/wonde-sync",
    date: "2026-06-07",
    title: "News mention",
    snippet: "Menção a nova parceria para sincronização de dados com SIS.",
    summary: "Menção a nova parceria para sincronização de dados com SIS.",
    product: ["HUB.Educacional"]
  },
  {
    id: "evt-003",
    competitor: "Matific",
    type: "social_linkedin",
    source: "LinkedIn",
    confidence: "low",
    url: "https://www.linkedin.com/company/matific",
    date: "2026-06-06",
    title: "LinkedIn post",
    snippet: "Post sobre aula adaptativa com foco em engajamento de matemática.",
    summary: "Post sobre aula adaptativa com foco em engajamento de matemática.",
    product: ["Aprimora"]
  },
  {
    id: "evt-004",
    competitor: "Robomind",
    type: "website_change",
    source: "/updates",
    confidence: "high",
    url: "https://robomind.com.br/updates",
    date: "2026-06-05",
    title: "Product update",
    snippet: "Atualização de portfólio com kit micro:bit e novos materiais de apoio.",
    summary: "Atualização de portfólio com kit micro:bit e novos materiais de apoio.",
    product: ["micro:bit", "Inventura"]
  },
  {
    id: "evt-005",
    competitor: "NEDU",
    type: "news",
    source: "news",
    confidence: "med",
    url: "https://example.com/news/nedu-ai",
    date: "2026-06-05",
    title: "News article",
    snippet: "Cobertura sobre IA conversacional em relatórios escolares.",
    summary: "Cobertura sobre IA conversacional em relatórios escolares.",
    product: ["NEDU", "HUB.Educacional"]
  },
  {
    id: "evt-006",
    competitor: "Google for Education",
    type: "website_change",
    source: "/education",
    confidence: "high",
    url: "https://edu.google.com/",
    date: "2026-06-04",
    title: "Education update",
    snippet: "Nova ênfase em classroom workflows e integração com Workspace.",
    summary: "Nova ênfase em classroom workflows e integração com Workspace.",
    product: ["HUB.Educacional"]
  },
  {
    id: "evt-007",
    competitor: "Microsoft Education",
    type: "social_youtube",
    source: "YouTube",
    confidence: "med",
    url: "https://www.youtube.com/@microsofteducation",
    date: "2026-06-03",
    title: "YouTube video",
    snippet: "Vídeo sobre AI in classrooms e produtividade para escolas.",
    summary: "Vídeo sobre AI in classrooms e produtividade para escolas.",
    product: ["HUB.Educacional", "NEDU"]
  },
  {
    id: "evt-008",
    competitor: "PlayTable",
    type: "news",
    source: "news",
    confidence: "low",
    url: "https://example.com/news/playtable",
    date: "2026-06-02",
    title: "News mention",
    snippet: "Menção a expansão de uso em ambientes de educação infantil.",
    summary: "Menção a expansão de uso em ambientes de educação infantil.",
    product: ["Mesa Educacional"]
  }
];

export const competitors: CompetitorItem[] = [
  {
    id: "clever",
    name: "Clever",
    website: "https://clever.com/",
    scope: "benchmark_global",
    regions: ["GLOBAL"],
    markets: ["public", "private"],
    tags: ["SSO", "integration", "analytics"],
    status: "active",
    last_run: "2026-06-08T09:00:00Z",
    events_7d: 6,
    impacted_products: ["HUB.Educacional"]
  },
  {
    id: "matific",
    name: "Matific",
    website: "https://www.matific.com/",
    scope: "benchmark_global",
    regions: ["GLOBAL"],
    markets: ["public", "private"],
    tags: ["math", "gamification", "adaptive learning"],
    status: "active",
    last_run: "2026-06-07T09:00:00Z",
    events_7d: 4,
    impacted_products: ["Aprimora"]
  },
  {
    id: "robomind",
    name: "Robomind",
    website: "https://robomind.com.br/",
    scope: "competes_market",
    regions: ["BR"],
    markets: ["public", "private"],
    tags: ["maker", "micro:bit", "stem"],
    status: "paused",
    last_run: "2026-06-04T09:00:00Z",
    events_7d: 5,
    impacted_products: ["Robotis", "Inventura", "micro:bit"]
  }
];

export const productRanking = [
  { product: "HUB.Educacional", count: 12 },
  { product: "Aprimora", count: 10 },
  { product: "Robotis", count: 8 },
  { product: "Inventura", count: 7 },
  { product: "LEGO Education", count: 6 },
  { product: "micro:bit", count: 5 },
  { product: "Mesa Educacional", count: 4 },
  { product: "NEDU", count: 3 },
  { product: "Pense +", count: 2 },
  { product: "Learnlab", count: 1 }
];

export const reports: ReportItem[] = [
  {
    date: "2026-06-09",
    title: "Resumo Semanal - 2026-06-09",
    markdown: "# Resumo Semanal\n\nResumo...",
    html: "<h1>Resumo Semanal</h1><p>Resumo...</p>"
  },
  {
    date: "2026-06-02",
    title: "Resumo Semanal - 2026-06-02",
    markdown: "# Resumo Semanal\n\nResumo anterior...",
    html: "<h1>Resumo Semanal</h1><p>Resumo anterior...</p>"
  }
];

export const candidates: CandidateItem[] = [
  {
    id: "cand-1",
    name: "Pear Deck",
    website: "https://peardeck.com/",
    reason: "Boa referência para engajamento em sala e fluxo docente.",
    products: ["Aprimora", "HUB.Educacional"],
    score: 92
  },
  {
    id: "cand-2",
    name: "Code.org",
    website: "https://code.org/",
    reason: "Benchmark forte para formação e distribuição de conteúdo.",
    products: ["Inventura", "micro:bit"],
    score: 87
  },
  {
    id: "cand-3",
    name: "ClassLink",
    website: "https://www.classlink.com/",
    reason: "Arquitetura de integração e SSO alinhada ao HUB.",
    products: ["HUB.Educacional"],
    score: 84
  }
];
