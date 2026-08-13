import { timeAgo } from "@/lib/format";
import { refreshInsightAction } from "@/app/sites/actions";

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
} | null;

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

export default function InsightPanel({
  insight,
  siteId,
}: {
  insight: Insight;
  siteId: string;
}) {
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-text">SEO &amp; sinais externos</h3>
        <form action={refreshInsightAction}>
          <input type="hidden" name="id" value={siteId} />
          <button className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-400 transition hover:bg-rose-500/10">
            Atualizar
          </button>
        </form>
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

          <p className="pt-3 text-right text-xs text-muted/70">
            atualizado {timeAgo(insight.collectedAt)}
          </p>
        </div>
      )}
    </div>
  );
}
