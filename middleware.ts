import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "status_session";

// Rotas públicas (sem sessão). Todo o resto exige login.
const PUBLIC_PATHS = ["/login"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = req.cookies.has(SESSION_COOKIE);
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // Gate barato: sem cookie de sessão em rota privada → manda pro login.
  // A validação real do token acontece na página (getCurrentAdmin).
  if (!hasSession && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Aplica a tudo, menos assets internos do Next e favicon.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
