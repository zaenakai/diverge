import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const publicPaths = new Set(["/", "/markets", "/accuracy", "/pricing", "/login"]);

function isPublicPath(pathname: string): boolean {
  if (publicPaths.has(pathname)) return true;
  // Allow auth API routes
  if (pathname.startsWith("/api/auth")) return true;
  // Allow Stripe webhook (needs raw body, no auth)
  if (pathname === "/api/stripe/webhook") return true;
  // Allow static assets and Next.js internals
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.includes(".")) return true;
  return false;
}

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (!req.auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Match all paths except static files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
