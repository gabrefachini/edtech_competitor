import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { z } from "zod";
import { normalizeCompetitorConfigs, readCompetitorFile, type NormalizedCompetitorConfig } from "../lib/competitorConfig";
import { resolveProjectPath } from "../lib/projectPaths";

const productSchema = z.object({
  name: z.string().min(1),
  keywords: z.array(z.string()).default([]),
  signals: z.array(z.string()).default([])
});

export type Product = z.infer<typeof productSchema>;

export type EventConfidence = "high" | "med" | "low";

export type EventFacts = {
  pricing_model?: "contact_sales" | "quote_based";
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

type ProductFile = Product[] | { products: Product[] } | { name: string; keywords?: string[]; signals?: string[] }[];

function loadYamlFile<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, "utf8");
  return yaml.load(raw) as T;
}

function normalizeProducts(raw: ProductFile): Product[] {
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === "object" && raw !== null && "products" in raw
      ? raw.products
      : [];
  return z.array(productSchema).parse(list);
}

export function loadConfig() {
  const competitorsPath = resolveProjectPath("config", "competitors.yaml");
  const productKbPath = resolveProjectPath("config", "product_kb.yaml");
  const productsPath = resolveProjectPath("config", "products.yaml");
  const competitorsRaw = readCompetitorFile(fs.readFileSync(competitorsPath, "utf8"));
  const productsRaw = fs.existsSync(productKbPath) ? loadYamlFile<ProductFile>(productKbPath) : loadYamlFile<ProductFile>(productsPath);

  const competitors: NormalizedCompetitorConfig[] = normalizeCompetitorConfigs(competitorsRaw.competitors ?? []);
  const products = normalizeProducts(productsRaw);
  return { competitors, products };
}
