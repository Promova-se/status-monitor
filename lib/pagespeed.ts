import { db } from "./db";

// PageSpeed Insights (dados de laboratório do Lighthouse). Sem login.
// Opcional: defina PAGESPEED_API_KEY para limites maiores.
const PSI_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const TIMEOUT_MS = 70000;

type PsResult = { score: number | null; lcpMs: number | null; cls: number | null };

async function fetchPageSpeed(
  url: string,
  strategy: "mobile" | "desktop",
): Promise<PsResult | null> {
  const params = new URLSearchParams({
    url,
    strategy,
    category: "performance",
  });
  const key = process.env.PAGESPEED_API_KEY;
  if (key) params.set("key", key);

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${PSI_URL}?${params.toString()}`, {
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    const lh = data?.lighthouseResult;
    if (!lh) return null;

    const rawScore = lh.categories?.performance?.score;
    const score = typeof rawScore === "number" ? Math.round(rawScore * 100) : null;
    const lcp = lh.audits?.["largest-contentful-paint"]?.numericValue;
    const cls = lh.audits?.["cumulative-layout-shift"]?.numericValue;

    return {
      score,
      lcpMs: typeof lcp === "number" ? Math.round(lcp) : null,
      cls: typeof cls === "number" ? Math.round(cls * 1000) / 1000 : null,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

// Mede mobile + desktop e grava no Insight (só sobrescreve o que conseguiu medir).
export async function collectPageSpeed(site: {
  id: string;
  url: string;
}): Promise<void> {
  const [mobile, desktop] = await Promise.all([
    fetchPageSpeed(site.url, "mobile"),
    fetchPageSpeed(site.url, "desktop"),
  ]);

  const data: Record<string, number | null> = {};
  if (mobile) {
    data.psMobile = mobile.score;
    data.lcpMs = mobile.lcpMs; // LCP/CLS de mobile (o que o Google prioriza)
    data.cls = mobile.cls;
  }
  if (desktop) data.psDesktop = desktop.score;

  if (Object.keys(data).length === 0) return; // nada medido; não mexe no banco

  await db.insight.upsert({
    where: { siteId: site.id },
    create: { siteId: site.id, ...data },
    update: data,
  });
}

export async function collectPageSpeedForAllActive(): Promise<number> {
  const sites = await db.site.findMany({
    where: { active: true },
    select: { id: true, url: true },
  });
  for (const site of sites) {
    try {
      await collectPageSpeed(site);
    } catch (err) {
      console.error(`Erro no PageSpeed de ${site.url}:`, err);
    }
  }
  return sites.length;
}
