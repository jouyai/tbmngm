import { NextRequest, NextResponse } from "next/server";

// Lightweight gate: redirect unauthenticated users away from /dashboard.
// Full verification happens server-side in each page/route (this only
// checks cookie presence to avoid an extra render).
export function middleware(req: NextRequest) {
  const hasSession = req.cookies.has("session");
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/dashboard") && !hasSession) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
