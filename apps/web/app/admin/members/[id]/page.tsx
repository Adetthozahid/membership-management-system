"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { MemberDetails, RenewalSummary } from "@mms/shared";
import { ArrowLeft, RefreshCw, Save } from "lucide-react";
import { apiRequest } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function displayValue(value: MemberDetails["formValues"][number]) {
  if (value.fileUrl) {
    return (
      <a className="text-primary hover:underline" href={value.fileUrl} target="_blank" rel="noreferrer">
        {value.fileName ?? value.fileUrl}
      </a>
    );
  }
  if (Array.isArray(value.value)) return value.value.join(", ");
  if (typeof value.value === "object" && value.value !== null) return JSON.stringify(value.value);
  return String(value.value ?? "-");
}

export default function MemberDetailsPage({ params }: { params: { id: string } }) {
  const [member, setMember] = useState<MemberDetails | null>(null);
  const [renewal, setRenewal] = useState<RenewalSummary | null>(null);
  const [renewalAmount, setRenewalAmount] = useState("");
  const [chandaAmount, setChandaAmount] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [memberDetails, renewalSummary] = await Promise.all([
      apiRequest<MemberDetails>(`/members/${params.id}`),
      apiRequest<RenewalSummary>(`/renewals/members/${params.id}`)
    ]);
    setMember(memberDetails);
    setRenewal(renewalSummary);
    setRenewalAmount(String(renewalSummary.renewal.fee || ""));
  }, [params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const flash = window.sessionStorage.getItem("mms_member_profile_flash");
    if (!flash) return;
    window.sessionStorage.removeItem("mms_member_profile_flash");
    setMessage(flash);
  }, []);

  async function recordRenewal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await apiRequest<RenewalSummary>(`/renewals/members/${params.id}/renew`, {
      method: "POST",
      body: JSON.stringify({ amount: renewalAmount ? Number(renewalAmount) : undefined })
    });
    setMessage("Renewal recorded.");
    await load();
  }

  async function recordChanda(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await apiRequest<RenewalSummary>(`/renewals/members/${params.id}/chanda-payments`, {
      method: "POST",
      body: JSON.stringify({ amount: Number(chandaAmount) })
    });
    setChandaAmount("");
    setMessage("Subscription fee payment recorded.");
    await load();
  }

  async function syncExpiry() {
    await apiRequest<RenewalSummary>(`/renewals/members/${params.id}/sync-expiry`, { method: "POST" });
    setMessage("Renewal status synced.");
    await load();
  }

  function money(value: number) {
    return `$${value.toFixed(2)}`;
  }

  function date(value: string | null) {
    return value ? new Date(value).toLocaleDateString() : "-";
  }

  if (!member || !renewal) {
    return <div className="rounded-md border bg-card p-5 text-sm text-muted-foreground">Loading member details...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/members">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to member list
          </Link>
        </Button>
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-primary">Member details</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">{member.fullName}</h1>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Core fields</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm md:grid-cols-2">
              {[
                ["Member ID", member.memberId ?? "Pending"],
                ["Email", member.email],
                ["Phone", member.phone ?? "-"],
                ["Status", member.status.replaceAll("_", " ")],
                ["Membership type", member.membershipType?.name ?? "-"],
                ["Joined", member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : "-"],
                ["Approved", member.approvedAt ? new Date(member.approvedAt).toLocaleDateString() : "-"],
                ["Expired", member.expiredAt ? new Date(member.expiredAt).toLocaleDateString() : "-"]
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="mt-1 break-words font-medium capitalize">{value}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Registration data</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              {member.formValues.length === 0 ? (
                <div className="rounded-md border bg-muted p-3 text-muted-foreground">No registration fields were submitted.</div>
              ) : (
                member.formValues.map((value) => (
                  <div key={value.id} className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">{value.label}</div>
                    <div className="mt-1 break-words font-medium">{displayValue(value)}</div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              {member.documents.length === 0 ? (
                <div className="rounded-md border bg-muted p-3 text-muted-foreground">No documents uploaded.</div>
              ) : (
                member.documents.map((document) => (
                  <a key={document.id} className="rounded-md border p-3 text-primary hover:underline" href={document.fileUrl} target="_blank" rel="noreferrer">
                    <div className="font-medium">{document.fileName}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{document.documentType}</div>
                  </a>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Renewal state</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  ["Renewal", renewal.renewal.required ? renewal.renewal.status.replaceAll("_", " ") : "Not required"],
                  ["Period ends", date(renewal.renewal.periodEndsAt)],
                  ["Grace ends", date(renewal.renewal.graceEndsAt)],
                  ["Directory visible", renewal.directoryVisible ? "Yes" : "No"],
                  ["Monthly subscription fee", renewal.chanda.required ? money(renewal.chanda.monthlyAmount) : "Not required"],
                  ["Subscription fee balance", money(renewal.chanda.balance)]
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">{label}</div>
                    <div className="mt-1 font-medium capitalize">{value}</div>
                  </div>
                ))}
              </div>
              {message ? <div className="rounded-md border bg-muted p-3">{message}</div> : null}
              <div className="grid gap-3 md:grid-cols-2">
                <form className="rounded-md border p-3" onSubmit={recordRenewal}>
                  <label className="block space-y-1 font-medium">
                    <span>Renewal payment</span>
                    <input className="h-10 w-full rounded-md border bg-background px-3 text-sm" type="number" min={0} value={renewalAmount} onChange={(event) => setRenewalAmount(event.target.value)} />
                  </label>
                  <Button className="mt-3 w-full" type="submit">
                    <Save className="h-4 w-4" aria-hidden="true" />
                    Record renewal
                  </Button>
                </form>
                <form className="rounded-md border p-3" onSubmit={recordChanda}>
                  <label className="block space-y-1 font-medium">
                    <span>Subscription fee payment</span>
                    <input className="h-10 w-full rounded-md border bg-background px-3 text-sm" type="number" min={0} value={chandaAmount} onChange={(event) => setChandaAmount(event.target.value)} />
                  </label>
                  <Button className="mt-3 w-full" type="submit" variant="outline">
                    <Save className="h-4 w-4" aria-hidden="true" />
                    Record subscription fee
                  </Button>
                </form>
              </div>
              <Button type="button" variant="outline" onClick={syncExpiry}>
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Sync expiry status
              </Button>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Status history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {member.statusLogs.length === 0 ? (
              <div className="rounded-md border bg-muted p-3 text-muted-foreground">No status history yet.</div>
            ) : (
              member.statusLogs.map((log) => (
                <div key={log.id} className="rounded-md border p-3">
                  <div className="font-medium capitalize">
                    {log.fromStatus?.replaceAll("_", " ") ?? "New"} to {log.toStatus.replaceAll("_", " ")}
                  </div>
                  <div className="mt-1 text-muted-foreground">{log.note ?? "No note"}</div>
                  <div className="mt-2 text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
