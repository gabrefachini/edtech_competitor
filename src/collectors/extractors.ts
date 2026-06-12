import type { EventFacts } from "../loadConfig";

type PartnershipType = NonNullable<EventFacts["new_partnerships"]>[number]["partnership_type"];

function compactText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function extractCurrency(text: string) {
  const patterns = [
    { currency: "R$", regex: /R\$\s?\d{1,3}(?:\.\d{3})*(?:,\d{2})?/g },
    { currency: "USD", regex: /\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g },
    { currency: "EUR", regex: /€\s?\d{1,3}(?:\.\d{3})*(?:,\d{2})?/g },
    { currency: "GBP", regex: /£\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g }
  ];
  const matches = patterns.flatMap((item) =>
    [...text.matchAll(item.regex)].map((match) => ({
      currency: item.currency,
      value: match[0]
    }))
  );
  return matches;
}

function detectPeriod(text: string) {
  const lower = text.toLowerCase();
  if (/(por mês|mensal|monthly|per month)/i.test(lower)) return "monthly";
  if (/(por ano|anual|annual|annually|per year)/i.test(lower)) return "annual";
  if (/(por aluno|per student|per learner)/i.test(lower)) return "per_student";
  if (/(por usuário|por usuario|per user|per seat)/i.test(lower)) return "per_user";
  return undefined;
}

function detectRegion(text: string) {
  const lower = text.toLowerCase();
  if (/(brazil|brasil|br)/i.test(lower)) return "BR";
  if (/(latam|américa latina|america latina)/i.test(lower)) return "LATAM";
  if (/(global|worldwide)/i.test(lower)) return "GLOBAL";
  return undefined;
}

export function extractPricingFacts(url: string, title: string, text: string): EventFacts | undefined {
  const combined = `${url}\n${title}\n${text}`;
  const lower = combined.toLowerCase();
  const pricingSignal = /(pricing|plan|plans|pricing page|preço|preco|price|fees|subscription|assinatura)/i.test(lower);
  if (!pricingSignal) return undefined;

  const prices = extractCurrency(combined);
  const facts: EventFacts = {};
  const period = detectPeriod(combined);
  const region = detectRegion(combined);

  if (prices.length) {
    facts.price_changes = prices.slice(0, 4).map((entry) => ({
      plan_name: title || undefined,
      old_price: null,
      new_price: entry.value,
      currency: entry.currency,
      billing_period: period,
      region,
      source_url: url
    }));
  } else if (/(contact sales|fale com vendas|sob consulta|request a quote|request quote|orçamento|orcamento)/i.test(lower)) {
    facts.pricing_model = "contact_sales";
  } else {
    facts.pricing_model = "quote_based";
  }

  return Object.keys(facts).length ? facts : undefined;
}

export function extractPartnershipFacts(url: string, title: string, text: string): EventFacts | undefined {
  const combined = `${title}\n${text}`;
  const lower = combined.toLowerCase();
  if (!/(partner|parceria|integration|integrations|integrado|integração|integracao|reseller|revenda)/i.test(lower) && !/partners?/i.test(url)) {
    return undefined;
  }

  const candidates = [
    ...combined.matchAll(/(?:with|com|parceria com|partner(?:ship)? with|integrado com|integration with)\s+([A-ZÀ-ÿ0-9][A-Za-zÀ-ÿ0-9&().,'’\-\s]{2,80})/gi),
    ...combined.matchAll(/(?:parceiro|partner):\s*([A-ZÀ-ÿ0-9][A-Za-zÀ-ÿ0-9&().,'’\-\s]{2,80})/gi)
  ];

  const partnerName = compactText(candidates.map((match) => match[1]).find(Boolean) || "");
  if (!partnerName) return undefined;

  const partnershipType: PartnershipType =
    /(integration|integrado|integração|integracao)/i.test(lower)
      ? "integration"
      : /(reseller|revenda)/i.test(lower)
        ? "reseller"
        : /(content|conteúdo|conteudo)/i.test(lower)
          ? "content"
          : /(ai|artificial intelligence|ia)/i.test(lower)
            ? "ai"
            : /(hardware|device|kit|robótica|robotica|robotics)/i.test(lower)
              ? "hardware"
              : "other";

  return {
    new_partnerships: [
      {
        partner_name: partnerName,
        partnership_type: partnershipType,
        scope: /(public|público)/i.test(lower) && /(private|privado)/i.test(lower) ? "both" : /(public|público)/i.test(lower) ? "public" : /(private|privado)/i.test(lower) ? "private" : "both",
        source_url: url
      }
    ]
  };
}

export function extractFeatureFacts(url: string, title: string, text: string): EventFacts | undefined {
  const combined = `${title}\n${text}`;
  const lower = combined.toLowerCase();
  if (!/(release|release notes|updates|update|changelog|blog|novidade|novidades|novo recurso|feature)/i.test(lower) && !/release|blog|update/i.test(url)) {
    return undefined;
  }

  const headingCandidate =
    combined
      .split(/\n+/)
      .map((line) => compactText(line))
      .find((line) => line.length > 6 && line.length < 120 && /^(new|nova|novo|feature|update|lançamento|release|improvement|improve)/i.test(line)) ||
    compactText(title);

  if (!headingCandidate) return undefined;

  return {
    new_features: [
      {
        feature_name: headingCandidate.slice(0, 80),
        area: /blog/i.test(url) ? "blog" : /release|changelog|update/i.test(url) ? "release-notes" : "product",
        description_short: compactText(text).slice(0, 160),
        source_url: url
      }
    ]
  };
}

export function extractFacts(url: string, title: string, text: string): EventFacts | undefined {
  return mergeFacts(extractPricingFacts(url, title, text), extractPartnershipFacts(url, title, text), extractFeatureFacts(url, title, text));
}

export function mergeFacts(...facts: Array<EventFacts | undefined>) {
  const merged: EventFacts = {};
  for (const fact of facts.filter(Boolean) as EventFacts[]) {
    if (fact.pricing_model) merged.pricing_model = fact.pricing_model;
    if (fact.price_changes?.length) merged.price_changes = [...(merged.price_changes ?? []), ...fact.price_changes];
    if (fact.new_partnerships?.length) merged.new_partnerships = [...(merged.new_partnerships ?? []), ...fact.new_partnerships];
    if (fact.new_features?.length) merged.new_features = [...(merged.new_features ?? []), ...fact.new_features];
  }
  return Object.keys(merged).length ? merged : undefined;
}
