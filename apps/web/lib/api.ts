import type {
  ApiHealthResponse,
  MemberSummary,
  PaginatedPublicMembersResponse,
  PublicCollection,
  PublicContentItem,
  BlogPostCommentsResponse,
  PublicMemberVerification,
  PublicSiteOverview
} from "@mms/shared";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(
    `${apiBaseUrl}/api${path}`,
    init?.cache
      ? init
      : {
          ...init,
          next: {
            revalidate: 15
          }
        }
  );

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

function withQuery(path: string, query?: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
}

export function getHealth() {
  return request<ApiHealthResponse>("/health");
}

export function getMembers() {
  return request<MemberSummary[]>("/members");
}

export function getPublicSite() {
  return request<PublicSiteOverview>("/public/site");
}

export function getPublicPage<T = unknown>(key: string) {
  return request<T>(`/public/pages/${encodeURIComponent(key)}`);
}

export function getPublicDirectory(query?: { search?: string; membershipTypeId?: string; page?: string | number; limit?: string | number }) {
  return request<PaginatedPublicMembersResponse>(withQuery("/public/directory", query));
}

export function verifyPublicMember(identifier: string) {
  return request<PublicMemberVerification>(`/public/directory/verify/${encodeURIComponent(identifier)}`, { cache: "no-store" });
}

export function getPublicCollection<T = PublicContentItem>(path: string, init?: RequestInit) {
  return request<PublicCollection<T>>(path, init);
}

export function getPublicPostComments(slug: string, init?: RequestInit) {
  return request<BlogPostCommentsResponse>(`/public/smritir-pata/${encodeURIComponent(slug)}/comments`, init);
}
