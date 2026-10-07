// Detecta versões de WordPress e plugins "por fora" (do HTML) e compara com as
// versões mais recentes do repositório oficial (api.wordpress.org). Só WordPress.

export type PluginInfo = {
  slug: string;
  installed: string | null;
  latest: string | null;
  outdated: boolean;
};

export type WpUpdates = {
  wpVersion: string | null;
  wpLatest: string | null;
  wpOutdated: boolean;
  plugins: PluginInfo[];
};

// Cache simples em memória (1h) para as consultas à api.wordpress.org.
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

// Extrai {slug -> maior versão válida vista} dos assets ?ver= dos plugins.
function parsePlugins(html: string): Map<string, string> {
  const found = new Map<string, string>();
  const re =
    /wp-content\/plugins\/([a-z0-9][a-z0-9._-]*)\/[^"'\s)]*?[?&]ver=([0-9][0-9.]*)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const slug = m[1].toLowerCase();
    const ver = m[2];
    if (!VALID_VER.test(ver)) continue;
    const cur = found.get(slug);
    if (!cur || compareVersions(ver, cur) > 0) found.set(slug, ver);
  }
  return found;
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

export async function collectWpUpdates(html: string): Promise<WpUpdates> {
  const wpVersion = parseWpVersion(html);
  const installed = parsePlugins(html);

  const wpLatest = await coreLatest();
  const wpOutdated =
    !!wpVersion && !!wpLatest && compareVersions(wpVersion, wpLatest) < 0;

  const plugins: PluginInfo[] = [];
  for (const [slug, inst] of installed) {
    const latest = await pluginLatest(slug);
    const outdated = !!latest && compareVersions(inst, latest) < 0;
    plugins.push({ slug, installed: inst, latest, outdated });
  }
  // Desatualizados primeiro, depois alfabético.
  plugins.sort(
    (a, b) =>
      Number(b.outdated) - Number(a.outdated) || a.slug.localeCompare(b.slug),
  );

  return { wpVersion, wpLatest, wpOutdated, plugins };
}
