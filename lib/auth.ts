import "server-only";
import { cookies } from "next/headers";
import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { hash, verify } from "@node-rs/argon2";
import { db } from "./db";

const SESSION_COOKIE = "status_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 dias

// Parâmetros Argon2id (custo de memória/tempo com boa margem de segurança).
const ARGON_OPTS = {
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON_OPTS);
}

export async function verifyPassword(
  storedHash: string,
  password: string,
): Promise<boolean> {
  try {
    return await verify(storedHash, password);
  } catch {
    return false;
  }
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Cria sessão: gera token aleatório, guarda só o hash no banco, devolve o token bruto no cookie.
export async function createSession(
  adminId: string,
  meta?: { ip?: string; userAgent?: string },
): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.session.create({
    data: {
      tokenHash,
      adminId,
      expiresAt,
      ip: meta?.ip,
      userAgent: meta?.userAgent?.slice(0, 255),
    },
  });

  // Cookie "Secure" exige HTTPS. Em produção com domínio, mantenha true.
  // Só para acesso temporário por http://IP, defina COOKIE_SECURE="false".
  const secure =
    process.env.COOKIE_SECURE != null
      ? process.env.COOKIE_SECURE === "true"
      : process.env.NODE_ENV === "production";

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: "strict",
    path: "/",
    expires: expiresAt,
  });
}

// Valida a sessão do cookie atual. Retorna o admin ou null.
export async function getCurrentAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const tokenHash = hashToken(token);
  const session = await db.session.findUnique({
    where: { tokenHash },
    include: { admin: true },
  });

  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return session.admin;
}

export async function destroyCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    const tokenHash = hashToken(token);
    await db.session.deleteMany({ where: { tokenHash } }).catch(() => {});
  }
  cookieStore.delete(SESSION_COOKIE);
}

// Comparação em tempo constante para strings (uso geral).
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export { SESSION_COOKIE };
