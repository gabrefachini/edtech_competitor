import crypto from "node:crypto";
import * as cheerio from "cheerio";

export type SearchHit = {
  title: string;
  snippet: string;
  url: string;
};

export type HtmlPage = {
  url: string;
  finalUrl: string;
  title: string;
  description: string;
  cleanedText: string;
  html: string;
  publishedAt?: string;
  channel?: string;
  statusCode: number;
  contentType: string | null;
};

const USER_AGENT = "Mozilla/5.0 (compatible; edtech_competitor/1.0; +https://localhost)";
const DEFAULT_TIMEOUT = 15000;

export function compactText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

export function hashContent(content: string) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

export async function sha256(content: string) {
  const bytes = new TextEncoder().encode(content);
  const hash = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function cleanHtml($: cheerio.CheerioAPI) {
  $("script, style, nav, header, footer, aside, noscript, svg, iframe").remove();
  return compactText($("body").text()).slice(0, 12000);
}

function extractPublishedAtFromHtml($: cheerio.CheerioAPI, html: string) {
  const metaCandidates = [
    $('meta[property="article:published_time"]').attr("content"),
    $('meta[name="published_time"]').attr("content"),
    $('meta[name="pubdate"]').attr("content"),
    $('meta[property="og:published_time"]').attr("content"),
    $("time[datetime]").first().attr("datetime")
  ].filter(Boolean) as string[];
  if (metaCandidates.length) return metaCandidates[0];
  const jsonLdMatch = html.match(/"datePublished"\s*:\s*"([^"]+)"/i);
  return jsonLdMatch?.[1];
}

function extractChannelFromHtml($: cheerio.CheerioAPI, html: string) {
  const candidates = [
    $('meta[itemprop="channelId"]').attr("content"),
    $('meta[name="author"]').attr("content"),
    $('meta[property="og:site_name"]').attr("content")
  ].filter(Boolean) as string[];
  if (candidates.length) return candidates[0];
  const jsonLdMatch = html.match(/"author"\s*:\s*\{[^}]*"name"\s*:\s*"([^"]+)"/i) ?? html.match(/"author"\s*:\s*"([^"]+)"/i);
  return jsonLdMatch?.[1];
}

export async function fetchHtmlPage(url: string): Promise<HtmlPage | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml" },
      signal: controller.signal
    });
    clearTimeout(timeout);
    const contentType = res.headers.get("content-type");
    if (!res.ok || !contentType?.includes("text/html")) {
      return {
        url,
        finalUrl: res.url || url,
        title: "",
        description: "",
        cleanedText: "",
        html: "",
        statusCode: res.status,
        contentType
      };
    }
    const html = await res.text();
    const $ = cheerio.load(html);
    const title = compactText($("title").text());
    const description = compactText($('meta[name="description"]').attr("content") || $('meta[property="og:description"]').attr("content") || "");
    const cleanedText = cleanHtml($);
    return {
      url,
      finalUrl: res.url || url,
      title,
      description,
      cleanedText,
      html,
      publishedAt: extractPublishedAtFromHtml($, html),
      channel: extractChannelFromHtml($, html),
      statusCode: res.status,
      contentType
    };
  } catch {
    return null;
  }
}

function parseSearchResults(html: string, maxResults = 5) {
  const results: SearchHit[] = [];
  const regex = /<a rel="nofollow" class="result__a" href="([^"]+)">([\s\S]*?)<\/a>[\s\S]*?<a class="result__snippet">([\s\S]*?)<\/a>/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) && results.length < maxResults) {
    const title = compactText(match[2].replace(/<[^>]+>/g, " "));
    const snippet = compactText(match[3].replace(/<[^>]+>/g, " "));
    results.push({ title, snippet, url: match[1] });
  }
  return results;
}

export async function searchDuckDuckGo(query: string, maxResults = 5): Promise<SearchHit[]> {
  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, { headers: { "user-agent": USER_AGENT } });
    const html = await res.text();
    if (!res.ok) return [];
    return parseSearchResults(html, maxResults);
  } catch {
    return [];
  }
}

export function normalizeUrl(base: string, targetPath: string) {
  return new URL(targetPath, base).toString();
}

function parseRobotsBlocks(robotsText: string) {
  const lines = robotsText.split(/\r?\n/);
  const groups: Array<{ agents: string[]; disallow: string[] }> = [];
  let current: { agents: string[]; disallow: string[] } | null = null;
  for (const line of lines) {
    const cleaned = line.split("#")[0].trim();
    if (!cleaned) continue;
    const [key, ...rest] = cleaned.split(":");
    const value = rest.join(":").trim();
    if (/^user-agent$/i.test(key)) {
      if (!current || current.disallow.length || current.agents.length) {
        current = { agents: [], disallow: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      continue;
    }
    if (/^disallow$/i.test(key) && current) {
      current.disallow.push(value);
    }
  }
  return groups;
}

export async function robotsAllows(baseUrl: string, targetUrl: string) {
  try {
    const robotsUrl = new URL("/robots.txt", baseUrl).toString();
    const res = await fetch(robotsUrl, { redirect: "follow" });
    if (!res.ok) return true;
    const txt = await res.text();
    const groups = parseRobotsBlocks(txt);
    const pathName = new URL(targetUrl).pathname || "/";
    for (const group of groups) {
      const applies = group.agents.includes("*") || group.agents.some((agent) => USER_AGENT.toLowerCase().includes(agent));
      if (!applies) continue;
      if (group.disallow.includes("/")) return false;
      if (group.disallow.some((entry) => entry && pathName.startsWith(entry))) return false;
    }
    return true;
  } catch {
    return true;
  }
}
