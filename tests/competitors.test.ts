import fs from "node:fs/promises";
import path from "node:path";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  normalizeCompetitor,
  toggleCompetitorStatus,
  runCompetitorNow,
  slugify
} from "../lib/competitors";

const tmpDir = path.join(process.cwd(), "tmp-tests");
const yamlPath = path.join(tmpDir, "competitors.yaml");

async function writeFixture(contents: string) {
  await fs.mkdir(tmpDir, { recursive: true });
  await fs.writeFile(yamlPath, contents, "utf8");
}

beforeEach(async () => {
  await fs.mkdir(tmpDir, { recursive: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("normalizeCompetitor", () => {
  it("corrige publix e converte strings em arrays", () => {
    const normalized = normalizeCompetitor({
      name: "Nova Edtech",
      website: "https://nova.example",
      markets: "publix; private",
      regions: "br, latam",
      tags: "SSO, BI; analytics",
      status: "paused",
      events_7d: "7",
      impacted_products: "HUB.Educacional; Aprimora"
    });

    expect(normalized.id).toBe(slugify("Nova Edtech"));
    expect(normalized.markets).toEqual(["public", "private"]);
    expect(normalized.regions).toEqual(["BR", "LATAM"]);
    expect(normalized.tags).toEqual(["SSO", "BI", "analytics"]);
    expect(normalized.status).toBe("paused");
    expect(normalized.events_7d).toBe(7);
    expect(normalized.impacted_products).toEqual(["HUB.Educacional", "Aprimora"]);
  });
});

describe("toggleStatus", () => {
  it("atualiza o YAML trocando active por paused", async () => {
    await writeFixture(`
version: "0.1"
competitors:
  - id: "clever"
    name: "Clever"
    website: "https://clever.com/"
    scope: "benchmark_global"
    regions: ["GLOBAL"]
    markets: ["public"]
    tags: ["SSO"]
    status: "active"
    last_run: null
    events_7d: 6
    impacted_products: ["HUB.Educacional"]
`);

    const updated = await toggleCompetitorStatus("clever", yamlPath);
    expect(updated?.status).toBe("paused");

    const file = await fs.readFile(yamlPath, "utf8");
    expect(file).toContain('status: paused');
  });
});

describe("runNow", () => {
  it("atualiza last_run e incrementa events_7d", async () => {
    await writeFixture(`
version: "0.1"
competitors:
  - id: "wonde"
    name: "Wonde"
    website: "https://wonde.com/"
    scope: "benchmark_global"
    regions: ["GLOBAL"]
    markets: ["public"]
    tags: ["integration"]
    status: "active"
    last_run: null
    events_7d: 3
    impacted_products: ["HUB.Educacional"]
`);

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-09T12:00:00.000Z"));

    const updated = await runCompetitorNow("wonde", yamlPath);

    expect(updated?.events_7d).toBe(4);
    expect(updated?.last_run).toBe("2026-06-09T12:00:00.000Z");

    const file = await fs.readFile(yamlPath, "utf8");
    expect(file).toMatch(/events_7d: 4/);
  });
});
