import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import AppHeader from "@/components/AppHeader";
import LatencyChart, { type Point } from "@/components/LatencyChart";
import { checkNowAction } from "@/app/sites/actions";
import {
  statusOf,
  levelColor,
  levelText,
  sslDaysLeft,
  timeAgo,
  incidentLabel,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");

  const { id } = await params;

  const site = await db.site.findUnique({ where: { id } });
  if (!site) notFound();

  const checks = await db.check.findMany({
    where: { siteId: id },
    orderBy: { checkedAt: "desc" },
    take: 60,
  });
  const incidents = await db.incident.findMany({
    where: { siteId: id },
    orderBy: { openedAt: "desc" },
    take: 20,
  });

  const lastCheck = checks[0] ?? null;
  const openIncidents = incidents.filter((i) => i.closedAt === null);
  const hasCritical = openIncidents.some((i) => i.severity === "critical");
  const hasWarning = openIncidents.some((i) => i.severity === "warning");
  const status = statusOf(lastCheck, hasCritical, hasWarning);

  const uptime =
    checks.length > 0
      ? Math.round(
          (checks.filter((c) => c.online).length / checks.length) * 100,
        )
      : null;

  const ssl = sslDaysLeft(lastCheck?.sslExpiresAt ?? null);

  const points: Point[] = [...checks]
    .reverse()
    .map((c) => ({
      label: new Date(c.checkedAt).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      latency: c.latencyMs,
      online: c.online ? 1 : 0,
    }));

  return (
    <div className="min-h-screen">
      <AppHeader email={admin.email} />

      <main className="mx-auto max-w-6xl px-6 py-8">
        <Link
          href="/"
          className="text-sm text-muted transition hover:text-rose-400"
        >
          ← Voltar
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span
                className={`h-3 w-3 rounded-full ${levelColor[status.level]}`}
              />
              <h2 className="text-2xl font-semibold tracking-tight text-text">
                {site.name}
              </h2>
              <span className={`text-sm font-medium ${levelText[status.level]}`}>
                {status.label}
              </span>
            </div>
            <a
              href={site.url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block text-sm text-muted hover:text-rose-400"
            >
              {site.url}
            </a>
          </div>
          <form action={checkNowAction}>
            <input type="hidden" name="id" value={site.id} />
            <button className="btn-ghost">Checar agora</button>
          </form>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Kpi label="Uptime (janela)" value={uptime != null ? `${uptime}%` : "—"} />
          <Kpi
            label="Latência atual"
            value={lastCheck?.latencyMs != null ? `${lastCheck.latencyMs} ms` : "—"}
          />
          <Kpi
            label="SSL"
            value={ssl != null ? `${ssl} dias` : "—"}
            tone={ssl != null && ssl <= 15 ? "warn" : undefined}
          />
          <Kpi label="Última checagem" value={timeAgo(lastCheck?.checkedAt ?? null)} />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="card p-5 lg:col-span-2">
            <h3 className="mb-4 font-semibold text-text">Latência ao longo do tempo</h3>
            <LatencyChart data={points} />
          </div>

          <div className="card p-5">
            <h3 className="mb-4 font-semibold text-text">Ferramentas do Google</h3>
            <div className="space-y-3">
              <ToolRow label="Google Analytics (GA4)" ok={lastCheck?.hasGa4 ?? null} />
              <ToolRow label="Search Console" ok={lastCheck?.hasGsc ?? null} />
            </div>
            <p className="mt-4 text-xs text-muted/70">
              Detectamos a presença das tags no HTML da página. Para análise
              profunda, use as ferramentas do Google.
            </p>
          </div>
        </div>

        <div className="mt-6 card p-5">
          <h3 className="mb-4 font-semibold text-text">Incidentes</h3>
          {incidents.length === 0 ? (
            <p className="text-sm text-muted">
              Nenhum incidente registrado. Tudo tranquilo. 🌸
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {incidents.map((i) => (
                <li key={i.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        i.closedAt
                          ? "bg-good"
                          : i.severity === "critical"
                            ? "bg-bad"
                            : "bg-warn"
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium text-text">
                        {incidentLabel(i.type)}
                        {i.closedAt && (
                          <span className="ml-2 text-xs text-good">resolvido</span>
                        )}
                      </p>
                      <p className="text-xs text-muted">{i.message}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted">
                    {timeAgo(i.openedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warn";
}) {
  return (
    <div className="card p-4">
      <p className="text-xs text-muted">{label}</p>
      <p
        className={`mt-1 text-xl font-semibold ${
          tone === "warn" ? "text-warn" : "text-text"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ToolRow({ label, ok }: { label: string; ok: boolean | null }) {
  const style =
    ok === null
      ? { dot: "bg-muted", text: "text-muted", word: "sem dados" }
      : ok
        ? { dot: "bg-good", text: "text-good", word: "detectado" }
        : { dot: "bg-bad", text: "text-bad", word: "ausente" };
  return (
    <div className="flex items-center justify-between rounded-lg bg-bg/40 px-3 py-2.5">
      <span className="text-sm text-text">{label}</span>
      <span className={`flex items-center gap-2 text-sm ${style.text}`}>
        <span className={`h-2 w-2 rounded-full ${style.dot}`} /> {style.word}
      </span>
    </div>
  );
}
