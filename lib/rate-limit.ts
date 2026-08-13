import "server-only";
import { db } from "./db";

const WINDOW_MS = 1000 * 60 * 15; // janela de 15 min
const MAX_FAILED = 5; // máx. de falhas por IP na janela

// Verifica se o IP está bloqueado por excesso de tentativas falhas.
export async function isRateLimited(ip: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);
  const failed = await db.loginAttempt.count({
    where: { ip, success: false, createdAt: { gte: since } },
  });
  return failed >= MAX_FAILED;
}

export async function recordAttempt(ip: string, success: boolean): Promise<void> {
  await db.loginAttempt.create({ data: { ip, success } });
  if (success) {
    // Login OK zera o histórico de falhas daquele IP.
    await db.loginAttempt
      .deleteMany({ where: { ip, success: false } })
      .catch(() => {});
  }
}

// Limpeza de registros antigos (chamada oportunista).
export async function pruneOldAttempts(): Promise<void> {
  const cutoff = new Date(Date.now() - WINDOW_MS * 4);
  await db.loginAttempt
    .deleteMany({ where: { createdAt: { lt: cutoff } } })
    .catch(() => {});
}
