import type { PublicSiteOverview } from "@mms/shared";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function fetchPublicSite(): Promise<PublicSiteOverview | null> {
  return fetch(`${apiBaseUrl}/api/public/site`, { cache: "no-store" })
    .then((response) => (response.ok ? (response.json() as Promise<PublicSiteOverview>) : null))
    .catch(() => null);
}
