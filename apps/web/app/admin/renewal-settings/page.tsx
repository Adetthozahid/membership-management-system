"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import type { MembershipTypeSummary } from "@mms/shared";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getMembershipTypes,
  updateMembershipTypeRenewalSettings,
} from "@/features/admin/renewal-settings/services";

export default function RenewalSettingsPage() {
  const [types, setTypes] = useState<MembershipTypeSummary[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState({
    renewalRequired: false,
    renewalFee: 0,
    renewalCycle: "yearly",
    gracePeriodDays: 0,
    directoryVisibleWhenExpired: false,
    monthlyChandaRequired: false,
    monthlyChandaAmount: 0
  });
  const [message, setMessage] = useState<string | null>(null);

  const selectType = useCallback((type: MembershipTypeSummary) => {
    setSelectedId(type.id);
    setForm({
      renewalRequired: type.renewalRequired,
      renewalFee: type.renewalFee,
      renewalCycle: type.renewalCycle ?? "yearly",
      gracePeriodDays: type.gracePeriodDays,
      directoryVisibleWhenExpired: type.directoryVisibleWhenExpired,
      monthlyChandaRequired: type.monthlyChandaRequired,
      monthlyChandaAmount: type.monthlyChandaAmount
    });
  }, []);

  const load = useCallback(async () => {
    const items = await getMembershipTypes();
    setTypes(items);
    if (!selectedId && items[0]) selectType(items[0]);
  }, [selectType, selectedId]);

  useEffect(() => {
    void load().catch(() => setMessage("Could not load renewal settings."));
  }, [load]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId) return;
    await updateMembershipTypeRenewalSettings(selectedId, form);
    setMessage("Renewal settings saved.");
    await load();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Membership types</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {types.map((type) => (
            <button
              key={type.id}
              type="button"
              className={`w-full rounded-md border px-3 py-2 text-left text-sm ${selectedId === type.id ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
              onClick={() => selectType(type)}
            >
              <div className="font-medium">{type.name}</div>
              <div className="text-xs opacity-80">{type.code}</div>
            </button>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Renewal and monthly subscription fee rules</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={save}>
            <label className="flex items-center gap-2 text-sm md:col-span-2">
              <input type="checkbox" checked={form.renewalRequired} onChange={(event) => setForm((current) => ({ ...current, renewalRequired: event.target.checked }))} />
              Renewal required
            </label>
            <label className="block space-y-1 text-sm font-medium">
              <span>Renewal fee</span>
              <input className="h-10 w-full rounded-md border bg-background px-3 text-sm" type="number" min={0} value={form.renewalFee} onChange={(event) => setForm((current) => ({ ...current, renewalFee: Number(event.target.value) }))} />
            </label>
            <label className="block space-y-1 text-sm font-medium">
              <span>Renewal cycle</span>
              <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.renewalCycle} onChange={(event) => setForm((current) => ({ ...current, renewalCycle: event.target.value }))}>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            <label className="block space-y-1 text-sm font-medium">
              <span>Grace period days</span>
              <input className="h-10 w-full rounded-md border bg-background px-3 text-sm" type="number" min={0} value={form.gracePeriodDays} onChange={(event) => setForm((current) => ({ ...current, gracePeriodDays: Number(event.target.value) }))} />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.directoryVisibleWhenExpired} onChange={(event) => setForm((current) => ({ ...current, directoryVisibleWhenExpired: event.target.checked }))} />
              Directory visible when expired
            </label>
            <label className="flex items-center gap-2 text-sm md:col-span-2">
              <input type="checkbox" checked={form.monthlyChandaRequired} onChange={(event) => setForm((current) => ({ ...current, monthlyChandaRequired: event.target.checked }))} />
              Monthly subscription fee required
            </label>
            <label className="block space-y-1 text-sm font-medium">
              <span>Monthly subscription fee amount</span>
              <input className="h-10 w-full rounded-md border bg-background px-3 text-sm" type="number" min={0} value={form.monthlyChandaAmount} onChange={(event) => setForm((current) => ({ ...current, monthlyChandaAmount: Number(event.target.value) }))} />
            </label>
            {message ? <div className="rounded-md border bg-muted p-3 text-sm md:col-span-2">{message}</div> : null}
            <Button className="md:col-span-2" type="submit" disabled={!selectedId}>
              <Save className="h-4 w-4" aria-hidden="true" />
              Save renewal settings
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
