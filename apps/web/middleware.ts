import { NextResponse, type NextRequest } from "next/server";

function hostnameFromUrl(value?: string) {
  if (!value) return "";
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return "";
  }
}

const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL ?? "";
const siteHost = hostnameFromUrl(process.env.NEXT_PUBLIC_SITE_URL);
const adminHost = hostnameFromUrl(adminUrl);
const hasDedicatedAdminHost = Boolean(adminHost && adminHost !== siteHost);

export function middleware(request: NextRequest) {
  const requestHost = request.nextUrl.hostname.toLowerCase();
  const isAdminHost = hasDedicatedAdminHost && requestHost === adminHost;
  const isAdminPath = request.nextUrl.pathname === "/admin" || request.nextUrl.pathname.startsWith("/admin/");
  const isLoginPath = request.nextUrl.pathname === "/login";

  if (isAdminHost && (request.nextUrl.pathname === "/" || isLoginPath)) {
    return NextResponse.rewrite(new URL("/admin/login", request.url));
  }

  if (adminUrl && hasDedicatedAdminHost && !isAdminHost && isAdminPath) {
    const redirectUrl = new URL(request.nextUrl.pathname + request.nextUrl.search, adminUrl);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/admin/:path*"]
};
