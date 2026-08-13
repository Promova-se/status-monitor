import tls from "node:tls";

export type CheckResult = {
  online: boolean;
  statusCode: number | null;
  latencyMs: number | null;
  sslValid: boolean | null;
  sslExpiresAt: Date | null;
  hasGa4: boolean | null;
  hasGsc: boolean | null;
  error: string | null;
};

const FETCH_TIMEOUT_MS = 15000;
const USER_AGENT =
  "StatusMonitor/1.0 (+monitoramento privado; verificacao de disponibilidade)";

// Garante que a URL tenha protocolo e seja válida.
export function normalizeUrl(raw: string): string {
  let u = raw.trim();
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  const parsed = new URL(u); // lança se inválida
  return parsed.toString().replace(/\/$/, "");
}

// Lê a data de expiração do certificado SSL via handshake TLS.
function checkSsl(
  hostname: string,
  port = 443,
): Promise<{ valid: boolean; expiresAt: Date | null }> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (r: { valid: boolean; expiresAt: Date | null }) => {
      if (settled) return;
      settled = true;
      try {
        socket.destroy();
      } catch {}
      resolve(r);
    };

    const socket = tls.connect(
      { host: hostname, port, servername: hostname, timeout: 10000 },
      () => {
        const cert = socket.getPeerCertificate();
        if (!cert || !cert.valid_to) return done({ valid: false, expiresAt: null });
        const expiresAt = new Date(cert.valid_to);
        const valid = socket.authorized && expiresAt.getTime() > Date.now();
        done({ valid, expiresAt });
      },
    );

    socket.on("error", () => done({ valid: false, expiresAt: null }));
    socket.on("timeout", () => done({ valid: false, expiresAt: null }));
  });
}

// Procura tags do Google no HTML.
function detectGoogleTags(html: string): { ga4: boolean; gsc: boolean } {
  const ga4 =
    /googletagmanager\.com\/gtag\/js\?id=G-/i.test(html) ||
    /gtag\(\s*['"]config['"]\s*,\s*['"]G-/i.test(html) ||
    /['"]G-[A-Z0-9]{6,}['"]/.test(html) ||
    /googletagmanager\.com\/gtm\.js/i.test(html) ||
    /google-analytics\.com\/(analytics|ga)\.js/i.test(html);

  const gsc =
    /<meta[^>]+name=["']google-site-verification["']/i.test(html);

  return { ga4, gsc };
}

export async function checkSite(url: string): Promise<CheckResult> {
  const result: CheckResult = {
    online: false,
    statusCode: null,
    latencyMs: null,
    sslValid: null,
    sslExpiresAt: null,
    hasGa4: null,
    hasGsc: null,
    error: null,
  };

  let hostname = "";
  let isHttps = false;
  try {
    const parsed = new URL(url);
    hostname = parsed.hostname;
    isHttps = parsed.protocol === "https:";
  } catch {
    result.error = "URL inválida";
    return result;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const started = Date.now();

  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,*/*" },
    });
    result.latencyMs = Date.now() - started;
    result.statusCode = res.status;
    // "no ar" = respondeu com status saudável (abaixo de 400).
    result.online = res.status < 400;

    const html = await res.text().catch(() => "");
    if (html) {
      const tags = detectGoogleTags(html);
      result.hasGa4 = tags.ga4;
      result.hasGsc = tags.gsc;
    }
  } catch (err) {
    result.online = false;
    result.error =
      err instanceof Error && err.name === "AbortError"
        ? "Timeout (site não respondeu a tempo)"
        : "Falha de conexão";
  } finally {
    clearTimeout(timer);
  }

  // SSL só faz sentido para https.
  if (isHttps && hostname) {
    const ssl = await checkSsl(hostname);
    result.sslValid = ssl.valid;
    result.sslExpiresAt = ssl.expiresAt;
  }

  return result;
}
