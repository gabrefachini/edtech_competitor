import { hashContent } from "./detectChanges";

export type NewsItem = {
  source: string;
  title: string;
  snippet: string;
  url: string;
  date?: string;
  confidence: "med";
};

async function searchDuckDuckGo(query: string): Promise<NewsItem[]> {
  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" } });
    const html = await res.text();
    const items: NewsItem[] = [];
    const regex = /<a rel="nofollow" class="result__a" href="([^"]+)">([\s\S]*?)<\/a>[\s\S]*?<a class="result__snippet">([\s\S]*?)<\/a>/g;
    let match;
    while ((match = regex.exec(html)) && items.length < 5) {
      const title = match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const snippet = match[3].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      items.push({ source: "search", title, snippet, url: match[1], confidence: "med" });
    }
    return items;
  } catch {
    return [];
  }
}

export async function collectNews(competitorName: string): Promise<NewsItem[]> {
  const queries = [
    `${competitorName} news`,
    `${competitorName} launch OR release OR partnership`,
    `${competitorName} site:news.google.com`
  ];
  const results = await Promise.all(queries.map((q) => searchDuckDuckGo(q)));
  return results.flat().map((item) => ({ ...item, url: item.url, title: item.title, snippet: item.snippet, source: `news:${competitorName}` }));
}
