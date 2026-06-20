"use client";

import { useMemberEndpoint, type MemberRenewalData } from "@/components/member/member-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function money(value: number) {
  return `BDT ${value.toFixed(2)}`;
}

function date(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : "-";
}

export default function RenewalStatusPage() {
  const { data, error } = useMemberEndpoint<MemberRenewalData>("/member/renewal-summary");

  if (error) return <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  if (!data) return <div className="rounded-md border bg-card p-5 text-sm text-muted-foreground">Loading renewal status...</div>;

  const rows = [
    ["Member ID", data.member.memberId ?? "-"],
    ["Membership type", data.membershipType?.name ?? "-"],
    ["Renewal required", data.renewal.required ? "Yes" : "No"],
    ["Status", data.renewal.required ? data.renewal.status.replaceAll("_", " ") : "Not required"],
    ["Fee", money(data.renewal.fee)],
    ["Cycle", data.renewal.cycle ?? "-"],
    ["Period starts", date(data.renewal.periodStartsAt)],
    ["Period ends", date(data.renewal.periodEndsAt)],
    ["Grace ends", date(data.renewal.graceEndsAt)],
    ["Days until due", data.renewal.daysUntilDue === null ? "-" : String(data.renewal.daysUntilDue)]
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-primary">Membership</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">Membership Status</h1>
        <p className="mt-2 text-sm text-muted-foreground">Renewal and monthly subscription fee information appears here when enabled for your membership type.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Current membership summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label} className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="mt-1 font-medium capitalize">{value}</div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Monthly subscription fee summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          {[
            ["Required", data.chanda.required ? "Yes" : "No"],
            ["Monthly amount", money(data.chanda.monthlyAmount)],
            ["Months due", String(data.chanda.monthsDue)],
            ["Total due", money(data.chanda.totalDue)],
            ["Paid total", money(data.chanda.paidTotal)],
            ["Balance", money(data.chanda.balance)]
          ].map(([label, value]) => (
            <div key={label} className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="mt-1 font-medium capitalize">{value}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
