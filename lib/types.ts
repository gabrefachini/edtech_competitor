export type EventItem = {
  id: string;
  competitor: string;
  type: string;
  source: string;
  confidence: "low" | "med" | "high";
  url: string;
  date: string;
  title: string;
  snippet: string;
  summary: string;
  product: string[];
  facts?: {
    pricing_model?: "contact_sales";
    price_changes?: Array<{
      plan_name?: string;
      old_price?: string | null;
      new_price?: string | null;
      currency?: string;
      billing_period?: string;
      region?: string;
      source_url: string;
    }>;
    new_partnerships?: Array<{
      partner_name: string;
      partnership_type: "integration" | "reseller" | "content" | "ai" | "hardware" | "other";
      scope: "public" | "private" | "both";
      source_url: string;
    }>;
    new_features?: Array<{
      feature_name: string;
      area?: string;
      description_short?: string;
      source_url: string;
    }>;
  };
  evidenceQuotes?: string[];
  productImpacts?: Array<{ product: string; score: number; reason: string }>;
};

export type CompetitorItem = {
  id: string;
  name: string;
  website: string;
  scope: "competes_market" | "benchmark_global";
  regions: string[];
  markets: string[];
  tags: string[];
  status: "active" | "paused" | "candidate";
  last_run: string;
  events_7d: number;
  impacted_products: string[];
};

export type ReportItem = {
  date: string;
  title: string;
  markdown: string;
  html: string;
};

export type CandidateItem = {
  id: string;
  name: string;
  website: string;
  reason: string;
  products: string[];
  score: number;
};
