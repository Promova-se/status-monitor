"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth";
import { normalizeUrl } from "@/lib/monitor";
import { runCheckForSite } from "@/lib/checks";
import { collectInsight } from "@/lib/insights";

export type SiteFormState = { error?: string; ok?: boolean };

async function requireAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) throw new Error("Não autenticado.");
  return admin;
}

export async function createSiteAction(
  _prev: SiteFormState,
  formData: FormData,
): Promise<SiteFormState> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const rawUrl = String(formData.get("url") ?? "").trim();
  const kind = String(formData.get("kind") ?? "domain");
  const category = String(formData.get("category") ?? "mine");

  if (!name) return { error: "Dê um nome para o site." };
  if (!rawUrl) return { error: "Informe a URL." };

  let url: string;
  try {
    url = normalizeUrl(rawUrl);
  } catch {
    return { error: "URL inválida. Ex.: loja.com.br ou sub.loja.com.br" };
  }

  const existing = await db.site.findFirst({ where: { url } });
  if (existing) return { error: "Esse endereço já está cadastrado." };

  const site = await db.site.create({
    data: {
      name,
      url,
      kind: kind === "subdomain" ? "subdomain" : "domain",
      category: category === "competitor" ? "competitor" : "mine",
    },
  });

  // Primeira checagem + coleta de SEO imediatas para já mostrar dados.
  runCheckForSite({ id: site.id, name: site.name, url: site.url }).catch(
    () => {},
  );
  collectInsight({ id: site.id, url: site.url }).catch(() => {});

  revalidatePath("/");
  return { ok: true };
}

// "Atualizar SEO" — recoleta os sinais externos sob demanda.
export async function refreshInsightAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const site = await db.site.findUnique({ where: { id } });
  if (site) {
    await collectInsight({ id: site.id, url: site.url });
  }
  revalidatePath(`/sites/${id}`);
}

export async function deleteSiteAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id) await db.site.delete({ where: { id } }).catch(() => {});
  revalidatePath("/");
}

export async function toggleSiteAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const site = await db.site.findUnique({ where: { id } });
  if (site) {
    await db.site.update({
      where: { id },
      data: { active: !site.active },
    });
  }
  revalidatePath("/");
}

// "Checar agora" — dispara uma checagem sob demanda.
export async function checkNowAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const site = await db.site.findUnique({ where: { id } });
  if (site) {
    await runCheckForSite({ id: site.id, name: site.name, url: site.url });
  }
  revalidatePath("/");
  revalidatePath(`/sites/${id}`);
}
