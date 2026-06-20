const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL ?? "";

function withoutTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function withPath(baseUrl: string, path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return baseUrl ? `${withoutTrailingSlash(baseUrl)}${normalizedPath}` : normalizedPath;
}

export function getSiteUrl(path = "/") {
  return withPath(siteUrl, path);
}

export function getAdminUrl(path = "/admin") {
  return withPath(adminUrl, path);
}

export function getMemberDashboardUrl(memberId?: string | null) {
  return memberId ? `/member?memberId=${encodeURIComponent(memberId)}` : "/member";
}
