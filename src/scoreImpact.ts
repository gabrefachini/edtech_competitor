import type { Product } from "./loadConfig.js";

export type ScoredImpact = {
  product: string;
  score: number;
  reason: string;
};

function countMatches(text: string, keywords: string[]) {
  const lower = text.toLowerCase();
  return keywords.reduce((acc, keyword) => acc + (lower.includes(keyword.toLowerCase()) ? 1 : 0), 0);
}

export function scoreImpact(eventText: string, products: Product[], context?: { region?: string; market?: string }) {
  const scored = products.map((product) => {
    const keywordScore = countMatches(eventText, product.keywords) * 3;
    const signalScore = countMatches(eventText, product.signals) * 5;
    const contextScore = context?.region || context?.market ? 1 : 0;
    const score = keywordScore + signalScore + contextScore;
    const reason = score > 0
      ? `Há sinais que se relacionam com ${product.name} por correspondência de termos e contexto competitivo.`
      : `Sem sinal forte, mas o evento ajuda a monitorar ${product.name} no radar competitivo.`;
    return { product: product.name, score, reason };
  });
  return scored.sort((a, b) => b.score - a.score).slice(0, 3);
}
