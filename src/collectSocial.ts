export type SocialItem = {
  source: "linkedin" | "instagram" | "youtube" | "x";
  title: string;
  snippet: string;
  url: string;
  date?: string;
  confidence: "low" | "med";
};

async function searchWeb(query: string, source: SocialItem["source"]): Promise<SocialItem[]> {
  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" } });
    const html = await res.text();
    const items: SocialItem[] = [];
    const regex = /<a rel="nofollow" class="result__a" href="([^"]+)">([\s\S]*?)<\/a>[\s\S]*?<a class="result__snippet">([\s\S]*?)<\/a>/g;
    let match;
    while ((match = regex.exec(html)) && items.length < 3) {
      const title = match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const snippet = match[3].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      items.push({ source, title, snippet, url: match[1], confidence: "low" });
    }
    return items;
  } catch {
    return [];
  }
}

export async function collectSocial(competitor: { name: string; socials?: Record<string, string> }) {
  const queries = ["linkedin", "instagram", "youtube", "x"].map((source) => ({
    source: source as SocialItem["source"],
    query: `${competitor.name} ${source}`
  }));
  const results = await Promise.all(queries.map(({ query, source }) => searchWeb(query, source)));
  return results.flat();
}
