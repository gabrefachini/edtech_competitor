import { competitors as seedCompetitors } from "./mockData";
import type { CompetitorItem } from "./types";

const STORAGE_KEY = "competitive-digest:competitors";

export function getStoredCompetitors(): CompetitorItem[] {
  if (typeof window === "undefined") return seedCompetitors;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedCompetitors;
    const parsed = JSON.parse(raw) as CompetitorItem[];
    return Array.isArray(parsed) && parsed.length ? parsed : seedCompetitors;
  } catch {
    return seedCompetitors;
  }
}

export function saveStoredCompetitors(competitors: CompetitorItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(competitors));
  window.dispatchEvent(new Event("competitive-digest:competitors-updated"));
}

export function buildCompetitorId(name: string, website: string) {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${website.toLowerCase().replace(/https?:\/\//, "").replace(/[^a-z0-9]+/g, "-")}`.replace(/^-+|-+$/g, "");
}
