import {
  BadgeCheck,
  CalendarDays,
  ExternalLink,
  IdCard,
  Mail,
  Phone,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import type { PublicMemberSummary } from "@mms/shared";

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (Array.isArray(value)) return value.map((item) => formatProfileValue(String(item))).join(", ");
  if (typeof value === "object") {
    const file = value as { fileName?: string; fileUrl?: string };
    return file.fileName ?? file.fileUrl ?? null;
  }
  return formatProfileValue(String(value));
}

function formatProfileValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed) || /^www\./i.test(trimmed) || trimmed === "#") return trimmed;
  return trimmed
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function dateValue(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isPublicProfileField(field: PublicMemberSummary["publicFields"][number]) {
  const normalized = `${field.key} ${field.label}`.toLowerCase().replace(/[^a-z0-9]/g, "");
  const blockedTerms = [
    "payment",
    "transaction",
    "trx",
    "receipt",
    "bkash",
    "nagad",
    "rocket",
    "amount",
    "renewal",
    "membershiptype",
    "membertype",
    "signature",
    "typedname",
    "consent",
    "declaration",
    "confirmed",
    "agreed",
  ];
  if (blockedTerms.some((term) => normalized.includes(term))) return false;
  return [
    "gender",
    "blood",
    "bloodgroup",
    "session",
    "batch",
    "graduation",
    "graduationyear",
    "degree",
    "occupation",
    "profession",
    "organization",
    "organisation",
    "company",
    "designation",
    "workaddress",
    "linkedin",
    "website",
    "facebook",
    "instagram",
  ].some((term) => normalized.includes(term));
}

function normalized(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function linkHref(value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  if (/^www\./i.test(value)) return `https://${value}`;
  return value.includes(".") ? `https://${value}` : value;
}

function contactLink(kind: "email" | "phone", value: string | null) {
  if (!value) return null;
  return kind === "email" ? `mailto:${value}` : `tel:${value}`;
}

function fieldHref(field: PublicMemberSummary["publicFields"][number] & { display: string }) {
  const key = normalized(field.key);
  const label = normalized(field.label);
  const linkLike = ["website", "facebook", "instagram", "linkedin", "profilelink"].some(
    (name) => key.includes(name) || label.includes(name),
  );
  if (!linkLike || field.display === "#") return null;
  return linkHref(field.display);
}

function LinkedValue({
  href,
  children,
}: {
  href: string | null;
  children: React.ReactNode;
}) {
  if (!href) return <>{children}</>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-w-0 items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline"
    >
      <span className="min-w-0 break-words">{children}</span>
      <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
    </a>
  );
}

export function VerificationResult({ member }: { member: PublicMemberSummary | null }) {
  if (!member) {
    return (
      <div className="rounded-md border bg-card p-5">
        <div className="flex items-center gap-3 text-red-700">
          <ShieldAlert className="h-5 w-5" aria-hidden="true" />
          <h2 className="font-semibold">No public verification record found</h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          The member may not exist, may not be approved, or may be hidden by renewal visibility settings.
        </p>
      </div>
    );
  }

  const publicFields = member.publicFields
    .filter((field) => isPublicProfileField(field))
    .map((field) => ({ ...field, display: displayValue(field.value) }))
    .filter((field): field is PublicMemberSummary["publicFields"][number] & { display: string } => Boolean(field.display));
  const emailHref = contactLink("email", member.email);
  const phoneHref = contactLink("phone", member.phone);

  return (
    <article className="overflow-hidden rounded-md border bg-card shadow-sm">
      <header className="bg-primary px-5 py-8 text-primary-foreground sm:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
            <div className="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-card bg-muted text-4xl font-bold text-primary shadow-lg">
              {member.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={member.photo} alt="" className="h-full w-full object-cover" />
              ) : (
                member.fullName
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
              )}
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 text-sm font-semibold ring-1 ring-white/25">
                <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                Verified association member
              </div>
              <h2 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">{member.fullName}</h2>
              <p className="mt-2 text-sm font-medium text-white/75">
                {member.membershipType?.name ?? "Association Member"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 ring-1 ring-white/20">
              <IdCard className="h-4 w-4" aria-hidden="true" />
              {member.memberId ?? "Pending"}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 ring-1 ring-white/20">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              Joined {dateValue(member.joinedAt)}
            </span>
          </div>
        </div>
      </header>

      <section className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[280px_1fr]">
        <aside>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-primary">
            <UserRound className="h-5 w-5" aria-hidden="true" />
            Contact
          </h3>
          <div className="mt-4 flex flex-col gap-2">
            <a
              href={emailHref ?? "#"}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!emailHref}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                emailHref
                  ? "text-primary hover:border-primary hover:bg-muted"
                  : "pointer-events-none text-muted-foreground"
              }`}
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              <span className="min-w-0 break-all">{member.email ?? "Email not available"}</span>
            </a>
            <a
              href={phoneHref ?? "#"}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!phoneHref}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                phoneHref
                  ? "text-primary hover:border-primary hover:bg-muted"
                  : "pointer-events-none text-muted-foreground"
              }`}
            >
              <Phone className="h-4 w-4" aria-hidden="true" />
              <span className="min-w-0 break-all">{member.phone ?? "Phone not available"}</span>
            </a>
          </div>
        </aside>

        <div>
          <div className="border-b pb-3">
            <h3 className="text-xl font-semibold text-primary">Public Profile Information</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Directory details shared by the association.
            </p>
          </div>
          {publicFields.length ? (
            <dl className="divide-y">
              {publicFields.map((field) => {
                const href = fieldHref(field);
                return (
                  <div key={`${field.key}-${field.label}`} className="grid gap-1 py-4 sm:grid-cols-[220px_1fr] sm:gap-6">
                    <dt className="text-sm font-semibold text-muted-foreground">{field.label}</dt>
                    <dd className="break-words text-base font-medium leading-7 text-foreground">
                      <LinkedValue href={href}>{field.display}</LinkedValue>
                    </dd>
                  </div>
                );
              })}
            </dl>
          ) : (
            <p className="mt-4 rounded-md border bg-muted/45 p-4 text-sm text-muted-foreground">
              No additional public profile information is available for this member.
            </p>
          )}
        </div>
      </section>
    </article>
  );
}
