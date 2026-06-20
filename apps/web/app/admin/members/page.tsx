"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { MEMBER_STATUSES, type MemberStatus, type PaginatedMembersResponse } from "@mms/shared";
import { Search } from "lucide-react";
import { apiRequest } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function StatusBadge({ status }: { status: MemberStatus }) {
  return (
    <span className="inline-flex rounded-md border bg-muted px-2 py-1 text-xs font-medium capitalize">
      {status.replaceAll("_", " ")}
    </span>
  );
}

export default function AdminMembersPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [members, setMembers] = useState<PaginatedMembersResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadMembers(params?: { search?: string; status?: string }) {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.status) query.set("status", params.status);
    query.set("limit", "50");

    try {
      setError(null);
      setMembers(await apiRequest<PaginatedMembersResponse>(`/members?${query.toString()}`));
    } catch {
      setError("Could not load members.");
    }
  }

  useEffect(() => {
    void loadMembers();
  }, []);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadMembers({ search, status });
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-primary">Admin area</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">Members</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Member directory</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="grid gap-3 md:grid-cols-[1fr_220px_auto]" onSubmit={onSubmit}>
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input
                className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, email, phone, member ID"
              />
            </label>
            <select
              className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">All statuses</option>
              {MEMBER_STATUSES.map((memberStatus) => (
                <option key={memberStatus} value={memberStatus}>
                  {memberStatus.replaceAll("_", " ")}
                </option>
              ))}
            </select>
            <Button type="submit">Apply</Button>
          </form>
          {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
          {!members ? (
            <div className="rounded-md border bg-muted p-4 text-sm text-muted-foreground">Loading members...</div>
          ) : members.items.length === 0 ? (
            <div className="rounded-md border bg-muted p-4 text-sm text-muted-foreground">No members match the current filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b text-muted-foreground">
                  <tr>
                    <th className="py-3 pr-4 font-medium">Member ID</th>
                    <th className="py-3 pr-4 font-medium">Name</th>
                    <th className="py-3 pr-4 font-medium">Email</th>
                    <th className="py-3 pr-4 font-medium">Type</th>
                    <th className="py-3 pr-4 font-medium">Status</th>
                    <th className="py-3 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {members.items.map((member) => (
                    <tr key={member.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">
                        <Link className="text-primary hover:underline" href={`/admin/members/${member.id}`}>
                          {member.memberId ?? "Pending"}
                        </Link>
                      </td>
                      <td className="py-3 pr-4">{member.fullName}</td>
                      <td className="py-3 pr-4">{member.email}</td>
                      <td className="py-3 pr-4">{member.membershipType?.name ?? "-"}</td>
                      <td className="py-3 pr-4">
                        <StatusBadge status={member.status} />
                      </td>
                      <td className="py-3">{member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
