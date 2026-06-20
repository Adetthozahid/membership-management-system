"use client";

import { FormEvent, useState } from "react";
import { useMemberEndpoint, type MemberPaymentsData } from "@/components/member/member-data";
import { MemberEmpty } from "@/components/member/member-empty";
import { submitMemberPayment } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function money(value: number) {
  return `BDT ${value.toFixed(2)}`;
}

function date(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : "-";
}

function mediaUrl(url: string | null) {
  if (!url) return null;
  return url.startsWith("http") ? url : `${apiBaseUrl}${url}`;
}

function paymentPurposeLabel(purpose: string) {
  if (purpose === "chanda") return "Subscription fee";
  return purpose.replaceAll("_", " ");
}

export default function PaymentHistoryPage() {
  const { data, error } = useMemberEndpoint<MemberPaymentsData>("/member/payments");
  const [purpose, setPurpose] = useState("donation");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setFormError(null);
    setIsSubmitting(true);
    try {
      await submitMemberPayment({ purpose, amount: Number(amount), note, proof });
      setAmount("");
      setNote("");
      setProof(null);
      setMessage("Payment request submitted. It will show as pending until admin approval.");
      window.location.reload();
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Could not submit payment request.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (error) return <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  if (!data) return <div className="rounded-md border bg-card p-5 text-sm text-muted-foreground">Loading payment history...</div>;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-primary">Payments</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">Payment History</h1>
        <p className="mt-2 text-sm text-muted-foreground">Submit donation, monthly subscription fee, renewal, or registration fee payments for admin approval.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Add new payment</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.05fr_0.8fr_1.25fr_1.2fr_auto]" onSubmit={submitPayment}>
            <label className="block space-y-2 text-sm font-semibold">
              <span>Category</span>
              <select className="h-11 w-full rounded-md border bg-card px-3 text-sm" value={purpose} onChange={(event) => setPurpose(event.target.value)}>
                <option value="donation">Donation</option>
                <option value="chanda">Monthly subscription fee</option>
                <option value="renewal">Renewal fee</option>
                <option value="registration_fee">Registration fee</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="block space-y-2 text-sm font-semibold">
              <span>Amount</span>
              <input className="h-11 w-full rounded-md border bg-card px-3 text-sm" type="number" min="1" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required />
            </label>
            <label className="block space-y-2 text-sm font-semibold">
              <span>Reference / note</span>
              <input className="h-11 w-full rounded-md border bg-card px-3 text-sm" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Transaction ID or short note" />
            </label>
            <label className="block space-y-2 text-sm font-semibold">
              <span>Payment proof</span>
              <input
                className="h-11 w-full rounded-md border bg-card px-3 py-2 text-sm"
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                onChange={(event) => setProof(event.target.files?.[0] ?? null)}
              />
            </label>
            <div className="flex items-end">
              <Button className="h-11 w-full" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting" : "Submit"}
              </Button>
            </div>
          </form>
          {message ? <div className="mt-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">{message}</div> : null}
          {formError ? <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div> : null}
        </CardContent>
      </Card>
      {data.items.length ? (
        <div className="responsive-table overflow-hidden rounded-md border bg-card">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Purpose</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Proof</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((payment) => (
                <tr key={payment.id} className="border-t">
                  <td className="px-4 py-3">{date(payment.paidAt ?? payment.createdAt)}</td>
                  <td className="px-4 py-3 capitalize">{paymentPurposeLabel(payment.purpose)}</td>
                  <td className="px-4 py-3 capitalize">{payment.status}</td>
                  <td className="px-4 py-3">
                    {payment.proofUrl ? (
                      <a className="font-semibold text-primary hover:underline" href={mediaUrl(payment.proofUrl) ?? "#"} target="_blank" rel="noreferrer">
                        {payment.proofFileName ?? "View proof"}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{money(payment.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <MemberEmpty title="No payments recorded" body="Approved and pending donation, subscription fee, renewal, registration fee, and other payment requests will appear here." />
      )}
    </div>
  );
}
