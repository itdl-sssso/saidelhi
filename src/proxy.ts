import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { PORTAL_COOKIES } from "./contract/auth";
import { routing } from "./i18n/routing";

const intl = createMiddleware(routing);

/** `/admin/...` or `/hi/admin/...`, excluding the login page itself. */
const PORTAL_PATH = /^(\/hi)?(\/admin(?:\/.*)?)$/;

export default function proxy(req: NextRequest) {
  const match = PORTAL_PATH.exec(req.nextUrl.pathname);
  // Visitors with no session cookie go straight to the login page (a real 307, not a streamed redirect).
  // An expired or revoked cookie is caught by the page itself, which checks the session in the database.
  if (match && !match[2].startsWith("/admin/login") && !req.cookies.has(PORTAL_COOKIES.session)) {
    const url = req.nextUrl.clone();
    url.pathname = `${match[1] ?? ""}/admin/login`;
    url.search = "";
    url.searchParams.set("next", `${match[2]}${req.nextUrl.search}`);
    return NextResponse.redirect(url);
  }
  return intl(req);
}

export const config = {
  matcher: "/((?!api|media/|_next|_vercel|.*\\..*).*)",
};
