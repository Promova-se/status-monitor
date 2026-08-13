// Funções puras de apresentação (usadas por server e client components).

export type StatusLevel = "up" | "warn" | "down" | "unknown";

export function timeAgo(date: Date | string | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "agora mesmo";
  const m = Math.floor(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h} h`;
  const days = Math.floor(h / 24);
  return `há ${days} d`;
}

export function sslDaysLeft(expiresAt: Date | string | null): number | null {
  if (!expiresAt) return null;
  const d = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  return Math.floor((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

type MinimalCheck = {
  online: boolean;
  latencyMs: number | null;
} | null;

// Nível geral do site a partir da última checagem + incidentes abertos.
export function statusOf(
  lastCheck: MinimalCheck,
  hasCriticalIncident: boolean,
  hasWarningIncident: boolean,
): { level: StatusLevel; label: string } {
  if (!lastCheck) return { level: "unknown", label: "Sem dados" };
  if (!lastCheck.online || hasCriticalIncident)
    return { level: "down", label: "Fora do ar" };
  if (hasWarningIncident) return { level: "warn", label: "Atenção" };
  return { level: "up", label: "No ar" };
}

export const levelColor: Record<StatusLevel, string> = {
  up: "bg-good",
  warn: "bg-warn",
  down: "bg-bad",
  unknown: "bg-muted",
};

export const levelText: Record<StatusLevel, string> = {
  up: "text-good",
  warn: "text-warn",
  down: "text-bad",
  unknown: "text-muted",
};

export function incidentLabel(type: string): string {
  const map: Record<string, string> = {
    offline: "Fora do ar",
    http_error: "Erro HTTP",
    ssl_expiring: "SSL",
    slow: "Lentidão",
    ga4_missing: "GA4 sumiu",
    gsc_missing: "Search Console sumiu",
  };
  return map[type] ?? type;
}
