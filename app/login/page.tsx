import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import LoginForm from "@/components/LoginForm";

export default async function LoginPage() {
  const admin = await getCurrentAdmin();
  if (admin) redirect("/");

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-text">
            Status
          </h1>
          <p className="mt-1 text-sm text-muted">
            Painel privado de monitoramento
          </p>
        </div>

        <div className="card p-8">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-muted/70">
          Acesso restrito. Todas as tentativas são registradas.
        </p>
      </div>
    </main>
  );
}
