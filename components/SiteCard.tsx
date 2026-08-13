import Link from "next/link";
import {
  statusOf,
  levelColor,
  levelText,
  timeAgo,
  sslDaysLeft,
} from "@/lib/format";
import {
  checkNowAction,
  toggleSiteAction,
  deleteSiteAction,
} from "@/app/sites/actions";

type Check = {
  online: boolean;
  statusCode: number | null;
  latencyMs: number | null;
  sslExpiresAt: Date | null;
  hasGa4: boolean | null;
  hasGsc: boolean | null;
  checkedAt: Date;
} | null;

type Incident = { id: string; severity: string };

export type SiteView = {
  id: string;
  name: string;
  url: string;
  kind: string;
  active: boolean;
  lastCheck: Check;
  incidents: Incident[];
};

function TagBadge({ ok, label }: { ok: boolean | null; label: string }) {
  if (ok === null)
    return (
      <span className="badge bg-surface-2 text-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-muted" /> {label}
      </span>
    );
  return ok ? (
    <span className="badge bg-good/10 text-good">
      <span className="h-1.5 w-1.5 rounded-full bg-good" /> {label}
    </span>
  ) : (
    <span className="badge bg-bad/10 text-bad">
      <span className="h-1.5 w-1.5 rounded-full bg-bad" /> {label}
    </span>
  );
}

export default function SiteCard({ site }: { site: SiteView }) {
  const hasCritical = site.incidents.some((i) => i.severity === "critical");
  const hasWarning = site.incidents.some((i) => i.severity === "warning");
  const status = statusOf(site.lastCheck, hasCritical, hasWarning);
  const ssl = sslDaysLeft(site.lastCheck?.sslExpiresAt ?? null);

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${levelColor[status.level]} ${
                status.level === "up" ? "animate-pulse" : ""
              }`}
            />
            <Link
              href={`/sites/${site.id}`}
              className="truncate font-semibold text-text hover:text-rose-400"
            >
              {site.name}
            </Link>
            {!site.active && (
              <span className="badge bg-surface-2 text-muted">pausado</span>
            )}
          </div>
          <a
            href={site.url}
            target="_blank"
            rel="noreferrer"
            className="mt-0.5 block truncate text-sm text-muted hover:text-rose-400"
          >
            {site.url.replace(/^https?:\/\//, "")}
          </a>
        </div>
        <span className={`text-sm font-medium ${levelText[status.level]}`}>
          {status.label}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg bg-bg/40 py-2">
          <p className="text-xs text-muted">Latência</p>
          <p className="text-sm font-semibold text-text">
            {site.lastCheck?.latencyMs != null
              ? `${site.lastCheck.latencyMs} ms`
              : "—"}
          </p>
        </div>
        <div className="rounded-lg bg-bg/40 py-2">
          <p className="text-xs text-muted">HTTP</p>
          <p className="text-sm font-semibold text-text">
            {site.lastCheck?.statusCode ?? "—"}
          </p>
        </div>
        <div className="rounded-lg bg-bg/40 py-2">
          <p className="text-xs text-muted">SSL</p>
          <p
            className={`text-sm font-semibold ${
              ssl != null && ssl <= 15 ? "text-warn" : "text-text"
            }`}
          >
            {ssl != null ? `${ssl}d` : "—"}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <TagBadge ok={site.lastCheck?.hasGa4 ?? null} label="GA4" />
        <TagBadge ok={site.lastCheck?.hasGsc ?? null} label="Search Console" />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
        <span className="text-xs text-muted">
          {site.lastCheck ? timeAgo(site.lastCheck.checkedAt) : "aguardando"}
        </span>
        <div className="flex items-center gap-1">
          <form action={checkNowAction}>
            <input type="hidden" name="id" value={site.id} />
            <button className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-400 transition hover:bg-rose-500/10">
              Checar agora
            </button>
          </form>
          <form action={toggleSiteAction}>
            <input type="hidden" name="id" value={site.id} />
            <button className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted transition hover:bg-surface-2 hover:text-text">
              {site.active ? "Pausar" : "Ativar"}
            </button>
          </form>
          <form action={deleteSiteAction}>
            <input type="hidden" name="id" value={site.id} />
            <button className="btn-danger text-xs">Excluir</button>
          </form>
        </div>
      </div>
    </div>
  );
}
