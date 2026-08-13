"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";
import { isRateLimited, recordAttempt, pruneOldAttempts } from "@/lib/rate-limit";

export type LoginState = { error?: string };

async function getClientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Preencha email e senha." };
  }

  const ip = await getClientIp();

  if (await isRateLimited(ip)) {
    return {
      error: "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
    };
  }

  const admin = await db.admin.findUnique({ where: { email } });

  // Sempre verifica algo para não vazar (por tempo) se o email existe.
  const ok =
    admin != null && (await verifyPassword(admin.passwordHash, password));

  if (!ok || !admin) {
    await recordAttempt(ip, false);
    return { error: "Email ou senha inválidos." };
  }

  await recordAttempt(ip, true);
  await pruneOldAttempts();

  const h = await headers();
  await createSession(admin.id, {
    ip,
    userAgent: h.get("user-agent") ?? undefined,
  });

  redirect("/");
}
