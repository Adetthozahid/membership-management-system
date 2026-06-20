import type { FormSectionSummary } from "@mms/shared";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function getRegistrationSections() {
  return fetch(`${apiBaseUrl}/api/public/registration-form`, {
    cache: "no-store",
  })
    .then((response) =>
      response.ok
        ? response.json().then((data) =>
            Array.isArray(data) ? (data as FormSectionSummary[]) : [],
          )
        : [],
    )
    .catch(() => []);
}
