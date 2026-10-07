// Detecta versões de WordPress e plugins "por fora" e compara com as versões
// mais recentes do repositório oficial (api.wordpress.org). Só WordPress.
//
// Versão instalada do plugin vem do readme.txt do próprio plugin (o "Stable tag"
// é a versão real). O ?ver= dos assets NÃO é usado para versão porque é pouco
// confiável (muitos plugins põem ali a versão do WP ou um hash de cache).
// Quando não dá para confirmar com segurança, o status é "unknown" (não
// verificável) — nunca um "ok" falso.

export type PluginStatus = "ok" | "outdated" | "unknown";

export type PluginInfo = {
  slug: string;
  installed: string | null;
  latest: string | null;
  status: PluginStatus;
};

export type WpUpdates = {
  wpVersion: string | null;
  wpLatest: string | null;
  wpOutdated: boolean;
  plugins: PluginInfo[];
};

const MAX_PLUGINS = 30;

// Cache (1h) só para as consultas à api.wordpress.org (versões globais).
const cache = new Map<string, { value: unknown; at: number }>();
const TTL_MS = 60 * 60 * 1000;

async function cachedJson(url: string): Promise<unknown> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "StatusMonitor/1.0" },
    });
    clearTimeout(t);
    if (!res.ok) {
      cache.set(url, { value: null, at: Date.now() });
      return null;
    }
    const json = await res.json();
    cache.set(url, { value: json, at: Date.now() });
    return json;
  } catch {
    return null;
  }
}

async function fetchText(url: string, timeoutMs = 7000): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "User-Agent": "StatusMonitor/1.0" },
    });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

// Compara versões tipo "7.1.3". Retorna -1, 0 ou 1.
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

const VALID_VER = /^\d+(\.\d+){0,3}$/;

function parseWpVersion(html: string): string | null {
  const m = html.match(/content=["']WordPress\s+([0-9.]+)/i);
  return m ? m[1] : null;
}

// Lista os slugs de plugins referenciados no HTML (não depende de ?ver=).
function parsePluginSlugs(html: string): string[] {
  const slugs = new Set<string>();
  const re = /wp-content\/plugins\/([a-z0-9][a-z0-9._-]*)\//gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) slugs.add(m[1].toLowerCase());
  return [...slugs].slice(0, MAX_PLUGINS);
}

// Lê o "Stable tag" do readme.txt do plugin instalado (versão real).
async function readmeStableTag(
  origin: string,
  slug: string,
): Promise<string | null> {
  for (const name of ["readme.txt", "README.txt"]) {
    const txt = await fetchText(`${origin}/wp-content/plugins/${slug}/${name}`);
    if (!txt) continue;
    const m = txt.match(/stable tag:\s*([0-9]+(?:\.[0-9]+){0,3})/i);
    if (m && VALID_VER.test(m[1])) return m[1];
  }
  return null;
}

async function coreLatest(): Promise<string | null> {
  const data = (await cachedJson(
    "https://api.wordpress.org/core/version-check/1.7/",
  )) as { offers?: Array<{ version?: string }> } | null;
  return data?.offers?.[0]?.version ?? null;
}

async function pluginLatest(slug: string): Promise<string | null> {
  const data = (await cachedJson(
    `https://api.wordpress.org/plugins/info/1.0/${encodeURIComponent(slug)}.json`,
  )) as { version?: string; error?: string } | null;
  if (!data || data.error) return null;
  return data.version ?? null;
}

export async function collectWpUpdates(
  html: string,
  baseUrl: string,
): Promise<WpUpdates> {
  const wpVersion = parseWpVersion(html);
  const slugs = parsePluginSlugs(html);
  const origin = new URL(baseUrl).origin;

  const wpLatest = await coreLatest();
  const wpOutdated =
    !!wpVersion && !!wpLatest && compareVersions(wpVersion, wpLatest) < 0;

  const plugins: PluginInfo[] = await Promise.all(
    slugs.map(async (slug) => {
      const [installed, latest] = await Promise.all([
        readmeStableTag(origin, slug),
        pluginLatest(slug),
      ]);
      let status: PluginStatus = "unknown";
      if (installed && latest) {
        const cmp = compareVersions(installed, latest);
        // instalado > latest = provável slug trocado/premium → não afirmar "ok".
        if (cmp < 0) status = "outdated";
        else if (cmp === 0) status = "ok";
        else status = "unknown";
      }
      return { slug, installed, latest, status };
    }),
  );

  const rank = { outdated: 0, ok: 1, unknown: 2 };
  plugins.sort(
    (a, b) => rank[a.status] - rank[b.status] || a.slug.localeCompare(b.slug),
  );

  return { wpVersion, wpLatest, wpOutdated, plugins };
}
