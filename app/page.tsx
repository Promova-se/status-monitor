import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import AppHeader from "@/components/AppHeader";
import AddSiteModal from "@/components/AddSiteModal";
import SiteCard, { type SiteView } from "@/components/SiteCard";
import { sslDaysLeft } from "@/lib/format";

export const dynamic = "force-dynamic";

type Category = "mine" | "competitor";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");

  const { tab } = await searchParams;
  const activeTab: Category = tab === "competitor" ? "competitor" : "mine";

  const rows = await db.site.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      checks: { orderBy: { checkedAt: "desc" }, take: 1 },
      incidents: {
        where: { closedAt: null },
        select: { id: true, severity: true },
      },
      insight: {
        select: {
          psMobile: true,
          indexable: true,
          techStack: true,
          metaDesc: true,
        },
      },
    },
  });

  const all: (SiteView & { category: string })[] = rows.map((s) => ({
    id: s.id,
    name: s.name,
    url: s.url,
    kind: s.kind,
    active: s.active,
    category: s.category,
    lastCheck: s.checks[0] ?? null,
    incidents: s.incidents,
    insight: s.insight,
  }));

  const mineCount = all.filter((s) => s.category !== "competitor").length;
  const compCount = all.filter((s) => s.category === "competitor").length;

  const sites = all.filter((s) =>
    activeTab === "competitor"
      ? s.category === "competitor"
      : s.category !== "competitor",
  );

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
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-text">
              Visão geral
            </h2>
            <p className="mt-1 text-sm text-muted">
              {activeTab === "competitor"
                ? "Acompanhe os sites dos seus concorrentes."
                : "Acompanhe a saúde de todos os seus domínios em um só lugar."}
            </p>
          </div>
          <AddSiteModal defaultCategory={activeTab} />
        </div>

        {/* Abas */}
        <div className="mb-8 inline-flex rounded-xl border border-line bg-surface/60 p-1">
          <Tab href="/?tab=mine" active={activeTab === "mine"} label="Meus sites" count={mineCount} />
          <Tab
            href="/?tab=competitor"
            active={activeTab === "competitor"}
            label="Concorrentes"
            count={compCount}
          />
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
              <span className="text-3xl">
                {activeTab === "competitor" ? "🔎" : "🌐"}
              </span>
            </div>
            <h3 className="text-lg font-medium text-text">
              {activeTab === "competitor"
                ? "Nenhum concorrente cadastrado ainda"
                : "Nenhum site cadastrado ainda"}
            </h3>
            <p className="mt-1 max-w-sm text-sm text-muted">
              {activeTab === "competitor"
                ? "Cadastre os sites dos seus concorrentes para acompanhá-los ao lado dos seus."
                : "Clique em “Adicionar site” para cadastrar seu primeiro domínio ou subdomínio."}
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

function Tab({
  href,
  active,
  label,
  count,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
        active
          ? "bg-rose-500 text-white shadow-glow"
          : "text-muted hover:text-text"
      }`}
    >
      {label}
      <span
        className={`ml-2 rounded-full px-1.5 py-0.5 text-xs ${
          active ? "bg-white/20" : "bg-surface-2 text-muted"
        }`}
      >
        {count}
      </span>
    </Link>
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
