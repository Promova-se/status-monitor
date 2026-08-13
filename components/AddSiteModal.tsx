"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { createSiteAction, type SiteFormState } from "@/app/sites/actions";

const initial: SiteFormState = {};

export default function AddSiteModal({
  defaultCategory = "mine",
}: {
  defaultCategory?: "mine" | "competitor";
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    createSiteAction,
    initial,
  );
  const router = useRouter();

  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      router.refresh();
    }
  }, [state.ok, router]);

  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}>
        <span className="text-lg leading-none">+</span>{" "}
        {defaultCategory === "competitor"
          ? "Adicionar concorrente"
          : "Adicionar site"}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="card w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text">
                Novo domínio / subdomínio
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="text-muted transition hover:text-text"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <form action={formAction} className="space-y-4">
              <div>
                <label className="label" htmlFor="name">
                  Nome
                </label>
                <input
                  id="name"
                  name="name"
                  className="input"
                  placeholder="Loja Principal"
                  required
                />
              </div>

              <div>
                <label className="label" htmlFor="url">
                  Endereço (URL)
                </label>
                <input
                  id="url"
                  name="url"
                  className="input"
                  placeholder="loja.com.br"
                  required
                />
                <p className="mt-1 text-xs text-muted/70">
                  Pode digitar sem https:// — a gente completa.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="kind">
                    Tipo
                  </label>
                  <select id="kind" name="kind" className="input">
                    <option value="domain">Domínio</option>
                    <option value="subdomain">Subdomínio</option>
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="category">
                    Grupo
                  </label>
                  <select
                    id="category"
                    name="category"
                    className="input"
                    defaultValue={defaultCategory}
                  >
                    <option value="mine">Meus sites</option>
                    <option value="competitor">Concorrentes</option>
                  </select>
                </div>
              </div>

              {state.error && (
                <p className="rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad">
                  {state.error}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={pending}
                >
                  {pending ? "Salvando..." : "Cadastrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
