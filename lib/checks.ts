import { db } from "./db";
import { checkSite, type CheckResult } from "./monitor";
import { sendTelegram } from "./notify";

export const SLOW_MS = 4000; // acima disso = "lento"
export const SSL_WARN_DAYS = 15; // avisa quando faltar <= isso

type IncidentEval = {
  type: string;
  active: boolean;
  severity: "critical" | "warning";
  message: string;
};

function daysUntil(date: Date): number {
  return Math.floor((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function evaluate(
  r: CheckResult,
  prev: { hasGa4: boolean | null; hasGsc: boolean | null } | null,
): IncidentEval[] {
  const reachable = r.statusCode != null;
  const evals: IncidentEval[] = [];

  // Fora do ar (não respondeu)
  evals.push({
    type: "offline",
    active: !reachable,
    severity: "critical",
    message: r.error ?? "Site não respondeu.",
  });

  // Erro HTTP (respondeu, mas com status ruim)
  const httpBad = reachable && (r.statusCode as number) >= 400;
  evals.push({
    type: "http_error",
    active: httpBad,
    severity: reachable && (r.statusCode as number) >= 500 ? "critical" : "warning",
    message: `Retornou HTTP ${r.statusCode}.`,
  });

  // Lento
  evals.push({
    type: "slow",
    active: r.online && r.latencyMs != null && r.latencyMs > SLOW_MS,
    severity: "warning",
    message: `Resposta lenta (${r.latencyMs} ms).`,
  });

  // SSL inválido ou expirando
  let sslActive = false;
  let sslMsg = "";
  let sslSev: "critical" | "warning" = "warning";
  if (r.sslValid === false) {
    sslActive = true;
    sslSev = "critical";
    sslMsg = "Certificado SSL inválido ou expirado.";
  } else if (r.sslExpiresAt) {
    const d = daysUntil(r.sslExpiresAt);
    if (d <= SSL_WARN_DAYS) {
      sslActive = true;
      sslSev = d <= 3 ? "critical" : "warning";
      sslMsg = `SSL expira em ${d} dia(s).`;
    }
  }
  evals.push({ type: "ssl_expiring", active: sslActive, severity: sslSev, message: sslMsg });

  // Tag GA4 sumiu (estava presente e agora não)
  evals.push({
    type: "ga4_missing",
    active: prev?.hasGa4 === true && r.hasGa4 === false,
    severity: "warning",
    message: "A tag do Google Analytics (GA4) sumiu da página.",
  });

  // Verificação do Search Console sumiu
  evals.push({
    type: "gsc_missing",
    active: prev?.hasGsc === true && r.hasGsc === false,
    severity: "warning",
    message: "A verificação do Search Console sumiu da página.",
  });

  return evals;
}

// Executa uma checagem completa de um site: mede, grava e reconcilia incidentes.
export async function runCheckForSite(site: {
  id: string;
  name: string;
  url: string;
}): Promise<CheckResult> {
  const prev = await db.check.findFirst({
    where: { siteId: site.id },
    orderBy: { checkedAt: "desc" },
    select: { hasGa4: true, hasGsc: true },
  });

  const result = await checkSite(site.url);

  await db.check.create({
    data: {
      siteId: site.id,
      online: result.online,
      statusCode: result.statusCode,
      latencyMs: result.latencyMs,
      sslValid: result.sslValid,
      sslExpiresAt: result.sslExpiresAt,
      hasGa4: result.hasGa4,
      hasGsc: result.hasGsc,
      error: result.error,
    },
  });

  const evals = evaluate(result, prev);

  for (const e of evals) {
    const open = await db.incident.findFirst({
      where: { siteId: site.id, type: e.type, closedAt: null },
    });

    if (e.active && !open) {
      await db.incident.create({
        data: {
          siteId: site.id,
          type: e.type,
          severity: e.severity,
          message: e.message,
        },
      });
      const icon = e.severity === "critical" ? "🔴" : "🟡";
      await sendTelegram(
        `${icon} <b>${site.name}</b>\n${e.message}\n${site.url}`,
      );
    } else if (!e.active && open) {
      await db.incident.update({
        where: { id: open.id },
        data: { closedAt: new Date() },
      });
      await sendTelegram(`🟢 <b>${site.name}</b>\nResolvido: ${open.type}\n${site.url}`);
    }
  }

  return result;
}

// Checa todos os sites ativos (usado pelo worker).
export async function runCheckForAllActive(): Promise<number> {
  const sites = await db.site.findMany({
    where: { active: true },
    select: { id: true, name: true, url: true },
  });
  for (const site of sites) {
    try {
      await runCheckForSite(site);
    } catch (err) {
      console.error(`Erro ao checar ${site.url}:`, err);
    }
  }
  return sites.length;
}
