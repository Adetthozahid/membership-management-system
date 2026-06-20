import Link from "next/link";
import type { PublicMemberSummary } from "@mms/shared";
import {
  ArrowRight,
  Droplets,
  ExternalLink,
  Facebook,
  Globe,
  GraduationCap,
  IdCard,
  Instagram,
  Linkedin,
  Phone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MemberChatButton } from "@/components/public/member-chat-button";

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") {
    const file = value as { fileName?: string; fileUrl?: string };
    return file.fileName ?? file.fileUrl ?? null;
  }
  return String(value);
}

function normalized(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findField(
  fields: Array<PublicMemberSummary["publicFields"][number] & { display: string }>,
  names: string[]
) {
  return fields.find((field) => {
    const key = normalized(field.key);
    const label = normalized(field.label);
    return names.some((name) => key.includes(name) || label.includes(name));
  });
}

function linkHref(value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  if (/^www\./i.test(value)) return `https://${value}`;
  return value.includes(".") ? `https://${value}` : value;
}

function socialField(
  fields: Array<PublicMemberSummary["publicFields"][number] & { display: string }>,
  names: string[]
) {
  const field = findField(fields, names);
  return field?.display ? linkHref(field.display) : null;
}

export function MemberCard({ member }: { member: PublicMemberSummary }) {
  const fields = member.publicFields
    .map((field) => ({ ...field, display: displayValue(field.value) }))
    .filter((field): field is PublicMemberSummary["publicFields"][number] & { display: string } => Boolean(field.display));
  const batchField = findField(fields, ["batch", "barch", "session", "year", "passingyear"]);
  const bloodField = findField(fields, ["blood", "bloodgroup"]);
  const batch = batchField?.display ?? (member.joinedAt ? new Date(member.joinedAt).getFullYear().toString() : "-");
  const socialLinks = [
    { label: "Website", href: socialField(fields, ["website", "web", "profilelink"]), icon: Globe },
    { label: "Facebook", href: socialField(fields, ["facebook", "fb"]), icon: Facebook },
    { label: "Instagram", href: socialField(fields, ["instagram", "insta"]), icon: Instagram },
    { label: "LinkedIn", href: socialField(fields, ["linkedin", "linked"]), icon: Linkedin }
  ];

  return (
    <article className="relative flex min-w-0 flex-col overflow-hidden rounded-md border border-[hsl(var(--border))]/75 bg-[linear-gradient(180deg,hsl(var(--card))_0%,hsl(var(--card))_68%,hsl(var(--background))_100%)] p-4 shadow-[0_14px_34px_rgba(23,66,64,0.10)] ring-1 ring-white/50 transition hover:-translate-y-0.5 hover:shadow-[0_20px_46px_rgba(23,66,64,0.15)]">
      <span className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--terracotta))]/45 to-transparent" />
      <div className="flex items-start gap-4">
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-[3px] border-card bg-muted text-lg font-semibold text-primary shadow-[0_0_0_1px_hsl(var(--border)),0_10px_20px_rgba(23,66,64,0.10)]">
          {member.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={member.photo} alt="" className="h-full w-full rounded-full object-cover" />
          ) : (
            member.fullName
              .split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 2)
          )}
          <span className="absolute bottom-0 right-0 h-[18px] w-[18px] rounded-full border-2 border-card bg-green-600 shadow-sm" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold leading-tight text-primary">{member.fullName}</h2>
          <p className="mt-1 text-xs font-medium text-muted-foreground">{member.membershipType?.name ?? "Verified Member"}</p>
          <span className="mt-2 inline-grid max-w-full grid-cols-[auto_1fr] items-center gap-1.5 rounded-md border border-[hsl(var(--border))]/70 bg-background/65 px-2.5 py-1.5 text-xs font-semibold text-primary shadow-inner">
            <IdCard className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="min-w-0 truncate">{member.memberId ?? "Pending"}</span>
          </span>
        </div>
      </div>
      <div className="my-3 flex items-center gap-2">
        <span className="h-px flex-1 bg-border/80" />
        <span className="h-1.5 w-1.5 rotate-45 bg-[hsl(var(--terracotta))]/40" />
        <span className="h-px flex-1 bg-border/80" />
      </div>
      <dl className="grid min-w-0 gap-2 text-sm">
        <div className="grid min-w-0 grid-cols-2 gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-primary shadow-sm ring-1 ring-green-700/10">
              <GraduationCap className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <dt className="truncate text-xs font-medium text-muted-foreground">Batch</dt>
              <dd className="truncate text-base font-bold text-primary">{batch}</dd>
            </span>
          </div>
          <div className="flex min-w-0 items-center gap-2 border-l pl-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[hsl(var(--terracotta))] shadow-sm ring-1 ring-[hsl(var(--terracotta))]/10">
              <Droplets className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <dt className="truncate text-xs font-medium text-muted-foreground">Blood Group</dt>
              <dd className="truncate text-base font-bold text-primary">{bloodField?.display ?? "-"}</dd>
            </span>
          </div>
        </div>
        <div className="mt-1 border-t pt-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-primary shadow-sm ring-1 ring-green-700/10">
              <Phone className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <dt className="truncate text-xs font-medium text-muted-foreground">Phone</dt>
              <dd className="truncate text-sm font-bold text-primary">{member.phone ?? "-"}</dd>
            </span>
          </div>
        </div>
      </dl>
      <div className="mt-3 grid grid-cols-4 divide-x rounded-md border-y border-[hsl(var(--border))]/75 bg-background/35 py-2">
        {socialLinks.map((item) => {
          const Icon = item.icon;
          const className =
            "mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-[hsl(var(--border))]/75 bg-card text-primary shadow-sm transition";
          return item.href ? (
            <a
              key={item.label}
              href={item.href}
              target="_blank"
              rel="noreferrer"
              aria-label={item.label}
              title={item.label}
              className={`${className} hover:-translate-y-0.5 hover:border-[hsl(var(--terracotta))]/45 hover:bg-muted hover:text-[hsl(var(--terracotta))] hover:shadow-md`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {item.label === "Website" ? <ExternalLink className="-ml-1 mt-3 h-2.5 w-2.5" aria-hidden="true" /> : null}
            </a>
          ) : (
            <span
              key={item.label}
              aria-label={`${item.label} unavailable`}
              title={`${item.label} unavailable`}
              className={`${className} cursor-not-allowed opacity-35 grayscale`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          );
        })}
      </div>
      <div className="mt-3 grid gap-2">
        <Button asChild size="default" className="h-10 w-full justify-between bg-primary text-sm shadow-lg shadow-primary/15 hover:bg-primary/90">
          <Link href={`/verify/${encodeURIComponent(member.memberId ?? member.id)}`}>
            View Profile
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
        </Button>
        <MemberChatButton memberId={member.id} memberName={member.fullName} />
      </div>
    </article>
  );
}
