import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { z } from "zod";

const competitorSchema = z.object({
  name: z.string().min(1),
  website: z.string().url(),
  socials: z
    .object({
      linkedin: z.string().optional(),
      instagram: z.string().optional(),
      youtube: z.string().optional(),
      x: z.string().optional()
    })
    .partial()
    .optional(),
  markets: z.array(z.string()).optional(),
  regions: z.array(z.string()).optional(),
  scope: z.enum(["competes_market", "benchmark_global"]).optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  products_impacted: z.array(z.string()).optional()
});

const productSchema = z.object({
  name: z.string().min(1),
  keywords: z.array(z.string()).default([]),
  signals: z.array(z.string()).default([])
});

export type Competitor = z.infer<typeof competitorSchema>;
export type Product = z.infer<typeof productSchema>;

export type EventConfidence = "high" | "med" | "low";

export type EventFacts = {
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


export function loadYamlFile<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, "utf8");
  return yaml.load(raw) as T;
}

export function loadConfig() {
  const root = process.cwd();
  const competitorsPath = path.join(root, "config", "competitors.yaml");
  const productsPath = path.join(root, "config", "products.yaml");
  const competitorsRaw = loadYamlFile<unknown>(competitorsPath);
  const productsRaw = loadYamlFile<unknown>(productsPath);
  const competitorsInput =
    Array.isArray(competitorsRaw)
      ? competitorsRaw
      : typeof competitorsRaw === "object" && competitorsRaw !== null && "competitors" in competitorsRaw
        ? (competitorsRaw as { competitors: unknown }).competitors
        : [];
  const competitors = z.array(competitorSchema).parse(competitorsInput);
  const products = z.array(productSchema).parse(productsRaw);
  return { competitors, products };
}
