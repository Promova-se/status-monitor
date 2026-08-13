import Link from "next/link";
import { logoutAction } from "@/app/actions";

export default function AppHeader({ email }: { email: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex flex-col">
          <h1 className="text-lg font-semibold leading-none text-text">
            Status
          </h1>
          <p className="text-xs text-muted">Monitor de sites</p>
        </Link>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-muted sm:inline">{email}</span>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted transition hover:bg-surface-2 hover:text-text"
            >
              Sair
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
