"use client";

import { FormEvent, useEffect, useState } from "react";
import type { MembershipTypeSummary } from "@mms/shared";
import { Save } from "lucide-react";
import { apiRequest } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const emptyForm = {
  name: "",
  code: "",
  description: "",
  renewalRequired: false,
  renewalFee: 0,
  renewalCycle: "",
  gracePeriodDays: 0,
  directoryVisibleWhenExpired: false,
  monthlyChandaRequired: false,
  monthlyChandaAmount: 0,
  active: true
};

export default function MembershipTypesPage() {
  const [items, setItems] = useState<MembershipTypeSummary[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setItems(await apiRequest<MembershipTypeSummary[]>("/membership-types"));
  }

  useEffect(() => {
    void load().catch(() => setError("Could not load membership types."));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await apiRequest<MembershipTypeSummary>(editingId ? `/membership-types/${editingId}` : "/membership-types", {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify(form)
      });
      setForm(emptyForm);
      setEditingId(null);
      await load();
    } catch {
      setError("Could not save membership type.");
    }
  }

  function edit(item: MembershipTypeSummary) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      code: item.code,
      description: item.description ?? "",
      renewalRequired: item.renewalRequired,
      renewalFee: item.renewalFee,
      renewalCycle: item.renewalCycle ?? "",
      gracePeriodDays: item.gracePeriodDays,
      directoryVisibleWhenExpired: item.directoryVisibleWhenExpired,
      monthlyChandaRequired: item.monthlyChandaRequired,
      monthlyChandaAmount: item.monthlyChandaAmount,
      active: item.active
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Edit membership type" : "New membership type"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={onSubmit}>
            {[
              ["name", "Name", "text"],
              ["code", "Code", "text"],
              ["renewalFee", "Renewal fee", "number"],
              ["gracePeriodDays", "Grace days", "number"],
              ["monthlyChandaAmount", "Monthly subscription fee", "number"]
            ].map(([key, label, type]) => (
              <label key={key} className="block space-y-1 text-sm font-medium">
                <span>{label}</span>
                <input
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  type={type}
                  value={String(form[key as keyof typeof form])}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      [key]: type === "number" ? Number(event.target.value) : event.target.value
                    }))
                  }
                  required={key === "name" || key === "code"}
                />
              </label>
            ))}
            <label className="block space-y-1 text-sm font-medium">
              <span>Renewal cycle</span>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                value={form.renewalCycle || "yearly"}
                onChange={(event) => setForm((current) => ({ ...current, renewalCycle: event.target.value }))}
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            <label className="block space-y-1 text-sm font-medium">
              <span>Description</span>
              <textarea
                className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              />
            </label>
            {[
              ["renewalRequired", "Renewal required"],
              ["directoryVisibleWhenExpired", "Visible when expired"],
              ["monthlyChandaRequired", "Monthly subscription fee required"],
              ["active", "Active"]
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(form[key as keyof typeof form])}
                  onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.checked }))}
                />
                {label}
              </label>
            ))}
            {error ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
            <Button className="w-full" type="submit">
              <Save className="h-4 w-4" aria-hidden="true" />
              Save
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Membership types</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b text-muted-foreground">
              <tr>
                <th className="py-3 pr-4 font-medium">Code</th>
                <th className="py-3 pr-4 font-medium">Name</th>
                <th className="py-3 pr-4 font-medium">Renewal</th>
                <th className="py-3 pr-4 font-medium">Subscription fee</th>
                <th className="py-3 pr-4 font-medium">Status</th>
                <th className="py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="py-3 pr-4 font-medium">{item.code}</td>
                  <td className="py-3 pr-4">{item.name}</td>
                  <td className="py-3 pr-4">{item.renewalRequired ? `$${item.renewalFee}` : "No"}</td>
                  <td className="py-3 pr-4">{item.monthlyChandaRequired ? `$${item.monthlyChandaAmount}` : "No"}</td>
                  <td className="py-3 pr-4">{item.active ? "Active" : "Inactive"}</td>
                  <td className="py-3">
                    <Button type="button" variant="outline" size="sm" onClick={() => edit(item)}>
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
