import { NextResponse, type NextRequest } from "next/server";

/**
 * Publishes the current path as a header.
 *
 * A layout in the App Router cannot read the pathname directly, and the root
 * layout needs it for one decision: the signed-out home page is a landing page
 * with its own chrome, while every other signed-out page keeps the normal
 * topbar and rails.
 */
export function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-pathname", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Skip static assets and the auth callbacks — nothing there reads the header,
  // and running middleware on them is wasted work on every request.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|opengraph-image).*)"],
};
