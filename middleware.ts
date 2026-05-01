import { NextResponse, type NextRequest } from "next/server";
import { verifySession, GATE_COOKIE } from "@/lib/gate";

// Gate the entire dashboard behind a custom /login page. Cron triggers and
// the public /api/health endpoint bypass the gate; everything else requires
// a valid HMAC-signed session cookie.

export const config = {
  // Run on every path except Next internals + static assets.
  matcher: [
    "/((?!_next/static|_next/image|_next/data|favicon.ico|fonts/|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff|woff2|ttf|map)$).*)",
  ],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow the login page itself + the auth endpoints (otherwise the
  // gate becomes a redirect loop).
  if (
    pathname === "/login" ||
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/logout"
  ) {
    return NextResponse.next();
  }

  // Cron requests bypass via Bearer secret — Vercel injects this on every
  // scheduled cron call, and authorizeCron() at the route level still
  // enforces the secret match. Same logic as lib/cron-auth.ts.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    const x = req.headers.get("x-cron-secret");
    if (auth === `Bearer ${cronSecret}` || x === cronSecret) {
      return NextResponse.next();
    }
  }

  // /api/health stays public so external uptime monitors can hit it.
  if (pathname === "/api/health") {
    return NextResponse.next();
  }

  // Verify session cookie. Fails open in dev when GATE_SESSION_SECRET unset
  // (matches our cron-auth pattern — easier local development).
  const sessionSecret = process.env.GATE_SESSION_SECRET;
  if (!sessionSecret) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(GATE_COOKIE)?.value;
  const ok = await verifySession(sessionSecret, cookie);
  if (ok) return NextResponse.next();

  // No valid session. For API routes return 401 JSON; for pages redirect to
  // /login (preserving the original destination for post-login redirect).
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", req.url);
  if (pathname !== "/" && pathname !== "/login") {
    loginUrl.searchParams.set("next", pathname + req.nextUrl.search);
  }
  return NextResponse.redirect(loginUrl);
}
