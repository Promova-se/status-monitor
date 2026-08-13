import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import AppHeader from "@/components/AppHeader";
import AddSiteModal from "@/components/AddSiteModal";
import SiteCard, { type SiteView } from "@/components/SiteCard";
import { sslDaysLeft } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");

  const rows = await db.site.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      checks: { orderBy: { checkedAt: "desc" }, take: 1 },
      incidents: {
        where: { closedAt: null },
        select: { id: true, severity: true },
      },
    },
  });

  const sites: SiteView[] = rows.map((s) => ({
    id: s.id,
    name: s.name,
    url: s.url,
    kind: s.kind,
    active: s.active,
    lastCheck: s.checks[0] ?? null,
    incidents: s.incidents,
  }));

  const online = sites.filter(
    (s) =>
      s.lastCheck?.online &&
      !s.incidents.some((i) => i.severity === "critical"),
  ).length;
  const openIncidents = sites.reduce((n, s) => n + s.incidents.length, 0);
  const sslExpiring = sites.filter((s) => {
    const d = sslDaysLeft(s.lastCheck?.sslExpiresAt ?? null);
    return d != null && d <= 15;
  }).length;

  return (
    <div className="min-h-screen">
      <AppHeader email={admin.email} />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-text">
              Visão geral
            </h2>
            <p className="mt-1 text-sm text-muted">
              Acompanhe a saúde de todos os seus domínios em um só lugar.
            </p>
          </div>
          <AddSiteModal />
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat label="Sites no ar" value={`${online}/${sites.length}`} tone="good" />
          <Stat
            label="Incidentes abertos"
            value={String(openIncidents)}
            tone={openIncidents > 0 ? "bad" : "muted"}
          />
          <Stat
            label="SSL expirando"
            value={String(sslExpiring)}
            tone={sslExpiring > 0 ? "warn" : "muted"}
          />
        </div>

        {sites.length === 0 ? (
          <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/15">
              <span className="text-3xl">🌐</span>
            </div>
            <h3 className="text-lg font-medium text-text">
              Nenhum site cadastrado ainda
            </h3>
            <p className="mt-1 max-w-sm text-sm text-muted">
              Clique em “Adicionar site” para cadastrar seu primeiro domínio ou
              subdomínio e começar o monitoramento.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {sites.map((s) => (
              <SiteCard key={s.id} site={s} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "good" | "bad" | "warn" | "muted";
}) {
  const color = {
    good: "text-good",
    bad: "text-bad",
    warn: "text-warn",
    muted: "text-text",
  }[tone];
  return (
    <div className="card p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-1 text-3xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}
