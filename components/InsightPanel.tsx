import { timeAgo } from "@/lib/format";
import { compareVersions, type PluginInfo } from "@/lib/wpupdates";
import {
  refreshInsightAction,
  refreshPageSpeedAction,
} from "@/app/sites/actions";

type Insight = {
  collectedAt: Date;
  title: string | null;
  titleLength: number | null;
  metaDesc: string | null;
  metaDescLength: number | null;
  h1Count: number | null;
  h1Text: string | null;
  canonical: string | null;
  indexable: boolean | null;
  ogPresent: boolean | null;
  wordCount: number | null;
  schemaTypes: string | null;
  techStack: string | null;
  sitemapUrls: number | null;
  psMobile: number | null;
  psDesktop: number | null;
  lcpMs: number | null;
  cls: number | null;
  wpVersion: string | null;
  wpLatest: string | null;
  pluginsJson: string | null;
} | null;

function parsePlugins(json: string | null): PluginInfo[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function scoreColor(v: number | null): string {
  if (v == null) return "text-muted";
  if (v >= 90) return "text-good";
  if (v >= 50) return "text-warn";
  return "text-bad";
}
function lcpColor(ms: number | null): string {
  if (ms == null) return "text-muted";
  if (ms <= 2500) return "text-good";
  if (ms <= 4000) return "text-warn";
  return "text-bad";
}
function clsColor(v: number | null): string {
  if (v == null) return "text-muted";
  if (v <= 0.1) return "text-good";
  if (v <= 0.25) return "text-warn";
  return "text-bad";
}

function ScoreBadge({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex-1 rounded-xl bg-bg/40 p-3 text-center">
      <p className="text-xs text-muted">{label}</p>
      <p className={`text-2xl font-semibold ${scoreColor(value)}`}>
        {value ?? "—"}
      </p>
    </div>
  );
}

function lenColor(len: number | null, min: number, max: number): string {
  if (len == null) return "text-muted";
  if (len < min || len > max) return "text-warn";
  return "text-good";
}

function Chips({ csv, empty }: { csv: string | null; empty: string }) {
  const items = csv ? csv.split(",").filter(Boolean) : [];
  if (items.length === 0)
    return <span className="text-sm text-muted">{empty}</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((i) => (
        <span key={i} className="badge bg-rose-500/10 text-rose-300">
          {i}
        </span>
      ))}
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line py-2.5 last:border-0">
      <span className="shrink-0 text-sm text-muted">{label}</span>
      <div className="min-w-0 text-right text-sm text-text">{children}</div>
    </div>
  );
}

function WordPressSection({
  wpVersion,
  wpLatest,
  plugins,
}: {
  wpVersion: string | null;
  wpLatest: string | null;
  plugins: PluginInfo[];
}) {
  const coreOutdated =
    !!wpVersion && !!wpLatest && compareVersions(wpVersion, wpLatest) < 0;
  const outdatedCount = plugins.filter((p) => p.outdated).length;

  return (
    <div className="mt-4 border-t border-line pt-4">
      <h4 className="mb-3 text-sm font-semibold text-text">
        WordPress &amp; atualizações
      </h4>

      <div className="mb-3 flex items-center justify-between rounded-lg bg-bg/40 px-3 py-2.5">
        <span className="text-sm text-text">WordPress (core)</span>
        {wpVersion ? (
          coreOutdated ? (
            <span className="badge bg-warn/10 text-warn">
              🟡 {wpVersion} → {wpLatest}
            </span>
          ) : (
            <span className="badge bg-good/10 text-good">
              ✓ {wpVersion} (atualizado)
            </span>
          )
        ) : (
          <span className="text-sm text-muted">versão não exposta</span>
        )}
      </div>

      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs text-muted">
          Plugins detectados: {plugins.length}
        </span>
        {outdatedCount > 0 && (
          <span className="text-xs font-medium text-warn">
            {outdatedCount} desatualizado(s)
          </span>
        )}
      </div>

      {plugins.length === 0 ? (
        <p className="text-sm text-muted">Nenhum plugin com versão exposta.</p>
      ) : (
        <ul className="space-y-1">
          {plugins.map((p) => (
            <li
              key={p.slug}
              className="flex items-center justify-between gap-3 rounded-lg bg-bg/40 px-3 py-2"
            >
              <span className="min-w-0 truncate text-sm text-text">{p.slug}</span>
              {p.latest == null ? (
                <span className="shrink-0 text-xs text-muted">
                  {p.installed} · não verificável
                </span>
              ) : p.outdated ? (
                <span className="badge shrink-0 bg-warn/10 text-warn">
                  🟡 {p.installed} → {p.latest}
                </span>
              ) : (
                <span className="shrink-0 text-xs text-good">
                  ✓ {p.installed}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-2 text-xs text-muted/70">
        “Não verificável” = plugin premium (fora do repositório oficial).
      </p>
    </div>
  );
}

export default function InsightPanel({
  insight,
  siteId,
}: {
  insight: Insight;
  siteId: string;
}) {
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="font-semibold text-text">SEO &amp; sinais externos</h3>
        <div className="flex items-center gap-1">
          <form action={refreshPageSpeedAction}>
            <input type="hidden" name="id" value={siteId} />
            <button className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-400 transition hover:bg-rose-500/10">
              Medir performance
            </button>
          </form>
          <form action={refreshInsightAction}>
            <input type="hidden" name="id" value={siteId} />
            <button className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-400 transition hover:bg-rose-500/10">
              Atualizar SEO
            </button>
          </form>
        </div>
      </div>

      {/* Performance / Core Web Vitals */}
      <div className="mb-4">
        <div className="flex gap-2">
          <ScoreBadge label="Performance mobile" value={insight?.psMobile ?? null} />
          <ScoreBadge label="Performance desktop" value={insight?.psDesktop ?? null} />
        </div>
        <div className="mt-2 flex gap-2">
          <div className="flex-1 rounded-xl bg-bg/40 p-3 text-center">
            <p className="text-xs text-muted">LCP</p>
            <p className={`text-lg font-semibold ${lcpColor(insight?.lcpMs ?? null)}`}>
              {insight?.lcpMs != null
                ? `${(insight.lcpMs / 1000).toFixed(1)}s`
                : "—"}
            </p>
          </div>
          <div className="flex-1 rounded-xl bg-bg/40 p-3 text-center">
            <p className="text-xs text-muted">CLS</p>
            <p className={`text-lg font-semibold ${clsColor(insight?.cls ?? null)}`}>
              {insight?.cls ?? "—"}
            </p>
          </div>
        </div>
        {insight?.psMobile == null && (
          <p className="mt-2 text-center text-xs text-muted/70">
            Clique em “Medir performance” (leva ~30s).
          </p>
        )}
      </div>

      {!insight || insight.title == null ? (
        <p className="py-6 text-center text-sm text-muted">
          Ainda sem dados de SEO. Clique em “Atualizar” para coletar agora.
        </p>
      ) : (
        <div className="space-y-0.5">
          <Row label="Título">
            <div>
              <p className="truncate">{insight.title}</p>
              <span className={`text-xs ${lenColor(insight.titleLength, 30, 60)}`}>
                {insight.titleLength} caracteres (ideal 30–60)
              </span>
            </div>
          </Row>

          <Row label="Meta description">
            <div>
              <p className="line-clamp-2">{insight.metaDesc ?? "—"}</p>
              {insight.metaDescLength != null && (
                <span className={`text-xs ${lenColor(insight.metaDescLength, 120, 160)}`}>
                  {insight.metaDescLength} caracteres (ideal 120–160)
                </span>
              )}
            </div>
          </Row>

          <Row label="H1">
            <span className={insight.h1Count === 1 ? "text-good" : "text-warn"}>
              {insight.h1Count} {insight.h1Count === 1 ? "(ok)" : "(ideal: 1)"}
            </span>
          </Row>

          <Row label="Indexável no Google">
            {insight.indexable ? (
              <span className="badge bg-good/10 text-good">sim</span>
            ) : (
              <span className="badge bg-bad/10 text-bad">NÃO (noindex)</span>
            )}
          </Row>

          <Row label="Canonical">
            <span className={insight.canonical ? "text-good" : "text-warn"}>
              {insight.canonical ? "presente" : "ausente"}
            </span>
          </Row>

          <Row label="Open Graph">
            <span className={insight.ogPresent ? "text-good" : "text-muted"}>
              {insight.ogPresent ? "presente" : "ausente"}
            </span>
          </Row>

          <Row label="Palavras na home">
            <span>{insight.wordCount ?? "—"}</span>
          </Row>

          <Row label="URLs no sitemap">
            <span>{insight.sitemapUrls ?? "sem sitemap"}</span>
          </Row>

          <Row label="Dados estruturados">
            <Chips csv={insight.schemaTypes} empty="nenhum" />
          </Row>

          <Row label="Tecnologias">
            <Chips csv={insight.techStack} empty="—" />
          </Row>

          {(insight.techStack ?? "")
            .split(",")
            .some((t) => t === "WordPress" || t === "WooCommerce") && (
            <WordPressSection
              wpVersion={insight.wpVersion}
              wpLatest={insight.wpLatest}
              plugins={parsePlugins(insight.pluginsJson)}
            />
          )}

          <p className="pt-3 text-right text-xs text-muted/70">
            atualizado {timeAgo(insight.collectedAt)}
          </p>
        </div>
      )}
    </div>
  );
}
