import * as cheerio from "cheerio";
import { db } from "./db";

const TIMEOUT_MS = 15000;
const UA =
  "StatusMonitor/1.0 (+monitoramento privado; auditoria externa de SEO)";

async function fetchText(url: string): Promise<{ html: string; status: number } | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": UA, Accept: "text/html,application/xml,*/*" },
    });
    const html = await res.text();
    return { html, status: res.status };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function detectTech(html: string): string[] {
  const t = new Set<string>();
  const has = (re: RegExp) => re.test(html);

  if (has(/gtag\/js\?id=G-/i) || has(/['"]G-[A-Z0-9]{6,}['"]/)) t.add("GA4");
  if (has(/googletagmanager\.com\/gtm\.js/i) || has(/GTM-[A-Z0-9]+/)) t.add("Google Tag Manager");
  if (has(/gtag\(['"]config['"],\s*['"]AW-/i) || has(/googleadservices\.com/i)) t.add("Google Ads");
  if (has(/connect\.facebook\.net\/.*fbevents\.js/i) || has(/fbq\(\s*['"]init['"]/)) t.add("Meta Pixel");
  if (has(/wp-content\/plugins\/woocommerce/i) || has(/class=["'][^"']*woocommerce/i)) t.add("WooCommerce");
  else if (has(/wp-content\//i) || has(/name=["']generator["'][^>]*WordPress/i)) t.add("WordPress");
  if (has(/cdn\.shopify\.com/i) || has(/Shopify\./)) t.add("Shopify");
  if (has(/tiendanube|nuvemshop/i)) t.add("Nuvemshop");
  if (has(/hotjar\.com/i)) t.add("Hotjar");
  if (has(/clarity\.ms/i)) t.add("Microsoft Clarity");
  if (has(/cloudflare/i)) t.add("Cloudflare");

  return [...t];
}

function extractSchemaTypes($: cheerio.CheerioAPI, html: string): string[] {
  const types = new Set<string>();

  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    try {
      const json = JSON.parse(raw);
      const walk = (node: unknown) => {
        if (Array.isArray(node)) return node.forEach(walk);
        if (node && typeof node === "object") {
          const t = (node as Record<string, unknown>)["@type"];
          if (typeof t === "string") types.add(t);
          if (Array.isArray(t)) t.forEach((x) => typeof x === "string" && types.add(x));
          const graph = (node as Record<string, unknown>)["@graph"];
          if (graph) walk(graph);
        }
      };
      walk(json);
    } catch {
      // JSON-LD malformado — ignora
    }
  });

  // Microdata (itemtype)
  const micro = html.match(/itemtype=["']https?:\/\/schema\.org\/([A-Za-z]+)["']/g);
  if (micro) micro.forEach((m) => {
    const t = m.match(/schema\.org\/([A-Za-z]+)/);
    if (t) types.add(t[1]);
  });

  return [...types];
}

async function countSitemapUrls(baseUrl: string): Promise<number | null> {
  try {
    const origin = new URL(baseUrl).origin;
    const res = await fetchText(`${origin}/sitemap.xml`);
    if (!res || res.status >= 400 || !res.html) return null;
    const locs = res.html.match(/<loc>/gi);
    return locs ? locs.length : 0;
  } catch {
    return null;
  }
}

export async function collectInsight(site: {
  id: string;
  url: string;
}): Promise<void> {
  const res = await fetchText(site.url);
  if (!res || !res.html) {
    // Não conseguiu baixar — grava só o timestamp para saber que tentou.
    await db.insight.upsert({
      where: { siteId: site.id },
      create: { siteId: site.id },
      update: { collectedAt: new Date() },
    });
    return;
  }

  const $ = cheerio.load(res.html);

  const title = $("title").first().text().trim() || null;
  const metaDesc =
    $('meta[name="description"]').attr("content")?.trim() || null;
  const h1s = $("h1");
  const h1Text = h1s.first().text().trim().slice(0, 300) || null;
  const canonical = $('link[rel="canonical"]').attr("href")?.trim() || null;

  const robots = (
    $('meta[name="robots"]').attr("content") ||
    $('meta[name="googlebot"]').attr("content") ||
    ""
  ).toLowerCase();
  const indexable = !robots.includes("noindex");

  const ogPresent = $('meta[property^="og:"]').length > 0;

  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const wordCount = bodyText ? bodyText.split(" ").length : 0;

  const schemaTypes = extractSchemaTypes($, res.html);
  const techStack = detectTech(res.html);
  const sitemapUrls = await countSitemapUrls(site.url);

  const data = {
    collectedAt: new Date(),
    title,
    titleLength: title?.length ?? null,
    metaDesc,
    metaDescLength: metaDesc?.length ?? null,
    h1Count: h1s.length,
    h1Text,
    canonical,
    indexable,
    ogPresent,
    wordCount,
    schemaTypes: schemaTypes.length ? schemaTypes.join(",") : null,
    techStack: techStack.length ? techStack.join(",") : null,
    sitemapUrls,
  };

  await db.insight.upsert({
    where: { siteId: site.id },
    create: { siteId: site.id, ...data },
    update: data,
  });
}

// Coleta insights de todos os sites ativos (usado pelo worker, cadência diária).
export async function collectInsightsForAllActive(): Promise<number> {
  const sites = await db.site.findMany({
    where: { active: true },
    select: { id: true, url: true },
  });
  for (const site of sites) {
    try {
      await collectInsight(site);
    } catch (err) {
      console.error(`Erro ao coletar insights de ${site.url}:`, err);
    }
  }
  return sites.length;
}
