"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { MemberDetails } from "@mms/shared";
import { CheckCircle2, ClipboardCheck, MessageSquareWarning, XCircle } from "lucide-react";
import { apiRequest } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ActionKind = "approve" | "reject" | "correction" | null;

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

function displayCorrectionValue(value: unknown) {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object" && value !== null) return JSON.stringify(value);
  return String(value ?? "-");
}

export default function AdminApplicationDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [application, setApplication] = useState<MemberDetails | null>(null);
  const [action, setAction] = useState<ActionKind>(null);
  const [note, setNote] = useState("");
  const [fieldKeys, setFieldKeys] = useState("");
  const [documentTypes, setDocumentTypes] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadApplication = useCallback(async () => {
    setApplication(await apiRequest<MemberDetails>(`/members/applications/${params.id}`));
  }, [params.id]);

  useEffect(() => {
    void loadApplication();
  }, [loadApplication]);

  async function submitAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!action) return;
    setError(null);
    setResult(null);
    try {
      if (action === "approve") {
        const response = await apiRequest<{ member: { memberId: string }; temporaryPassword: string; email?: { sent: boolean; reason?: string } }>(`/members/applications/${params.id}/approve`, {
          method: "POST",
          body: JSON.stringify({ approvalNote: note })
        });
        const approvalMessage =
          response.email?.sent
            ? `Approved as ${response.member.memberId}. Login email sent. Temporary password: ${response.temporaryPassword}`
            : `Approved as ${response.member.memberId}. Email not sent (${response.email?.reason ?? "not configured"}). Temporary password: ${response.temporaryPassword}`;
        window.sessionStorage.setItem("mms_member_profile_flash", approvalMessage);
        router.replace(`/admin/members/${params.id}`);
        return;
      }
      if (action === "reject") {
        await apiRequest(`/members/applications/${params.id}/reject`, {
          method: "POST",
          body: JSON.stringify({ reason: note })
        });
        setResult("Application rejected.");
      }
      if (action === "correction") {
        await apiRequest(`/members/applications/${params.id}/request-correction`, {
          method: "POST",
          body: JSON.stringify({
            message: note,
            fieldKeys: fieldKeys.split(",").map((item) => item.trim()).filter(Boolean),
            documentTypes: documentTypes.split(",").map((item) => item.trim()).filter(Boolean)
          })
        });
        setResult("Correction requested.");
      }
      setAction(null);
      setNote("");
      setFieldKeys("");
      setDocumentTypes("");
      await loadApplication();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Action failed.");
    }
  }

  async function markUnderReview() {
    setError(null);
    try {
      await apiRequest(`/members/applications/${params.id}/under-review`, { method: "POST" });
      await loadApplication();
    } catch {
      setError("Could not mark application under review.");
    }
  }

  async function applyCorrectionSubmission(submissionId: string) {
    setError(null);
    setResult(null);
    try {
      const response = await apiRequest<{ message: string }>(`/members/applications/${params.id}/apply-correction`, {
        method: "POST",
        body: JSON.stringify({ submissionId })
      });
      setResult(response.message);
      await loadApplication();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not apply correction.");
    }
  }

  if (!application) {
    return <div className="rounded-md border bg-card p-5 text-sm text-muted-foreground">Loading application...</div>;
  }
  const isApprovedProfile = Boolean(application.memberId) || application.status === "active" || application.status === "approved";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-primary">Application details</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">{application.fullName}</h1>
          <p className="mt-1 text-sm capitalize text-muted-foreground">{application.status.replaceAll("_", " ")}</p>
        </div>
        {isApprovedProfile ? (
          <Button type="button" onClick={() => router.push(`/admin/members/${application.id}`)}>
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Open member profile
          </Button>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={markUnderReview}>
              <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
              Review
            </Button>
            <Button type="button" onClick={() => setAction("approve")}>
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Approve
            </Button>
            <Button type="button" variant="outline" onClick={() => setAction("correction")}>
              <MessageSquareWarning className="h-4 w-4" aria-hidden="true" />
              Correction
            </Button>
            <Button type="button" variant="destructive" onClick={() => setAction("reject")}>
              <XCircle className="h-4 w-4" aria-hidden="true" />
              Reject
            </Button>
          </div>
        )}
      </div>

      {result ? <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">{result}</div> : null}
      {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Core fields</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm md:grid-cols-2">
              {[
                ["Application ID", application.id],
                ["Member ID", application.memberId ?? "Not generated"],
                ["Email", application.email],
                ["Phone", application.phone ?? "-"],
                ["Membership type", application.membershipType?.name ?? "-"],
                ["Submitted", new Date(application.createdAt).toLocaleString()]
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="mt-1 break-all font-medium">{value}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dynamic form data</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              {application.formValues.length === 0 ? (
                <div className="rounded-md border bg-muted p-3 text-muted-foreground">No dynamic fields were submitted.</div>
              ) : (
                application.formValues.map((value) => (
                  <div key={value.id} className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">{value.label}</div>
                    <div className="mt-1 break-words font-medium">{displayValue(value)}</div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Correction history</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {application.correctionRequests.length === 0 && application.correctionSubmissions.length === 0 ? (
                <div className="rounded-md border bg-muted p-3 text-muted-foreground">No correction activity.</div>
              ) : null}
              {application.correctionRequests.map((request) => (
                <div key={request.id} className="rounded-md border p-3">
                  <div className="font-medium">Requested</div>
                  <div className="mt-1 text-muted-foreground">{request.message}</div>
                  <div className="mt-2 text-xs text-muted-foreground">{new Date(request.createdAt).toLocaleString()}</div>
                </div>
              ))}
              {application.correctionSubmissions.map((submission) => (
                <div key={submission.id} className="rounded-md border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-medium">Submitted</div>
                    <Button type="button" size="sm" onClick={() => void applyCorrectionSubmission(submission.id)}>
                      Apply
                    </Button>
                  </div>
                  <div className="mt-1 text-muted-foreground">{submission.message ?? "No message"}</div>
                  {Object.keys(submission.values).length ? (
                    <div className="mt-3 space-y-2">
                      {Object.entries(submission.values).map(([key, value]) => (
                        <div key={key} className="rounded-md bg-muted px-3 py-2">
                          <div className="text-xs font-medium text-muted-foreground">{submission.fieldLabels[key] ?? "Field"}</div>
                          <div className="mt-1 break-words font-medium">{displayCorrectionValue(value)}</div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-2 text-xs text-muted-foreground">{new Date(submission.createdAt).toLocaleString()}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status history</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {application.statusLogs.map((log) => (
                <div key={log.id} className="rounded-md border p-3">
                  <div className="font-medium capitalize">
                    {log.fromStatus?.replaceAll("_", " ") ?? "New"} to {log.toStatus.replaceAll("_", " ")}
                  </div>
                  <div className="mt-1 text-muted-foreground">{log.note ?? "No note"}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {action ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form className="w-full max-w-lg rounded-md border bg-background p-5 shadow-lg" onSubmit={submitAction}>
            <h2 className="text-lg font-semibold capitalize">{action === "correction" ? "Request correction" : `${action} application`}</h2>
            <label className="mt-4 block space-y-1 text-sm font-medium">
              <span>{action === "reject" ? "Reason" : action === "approve" ? "Approval note" : "Message"}</span>
              <textarea className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm" required={action !== "approve"} value={note} onChange={(event) => setNote(event.target.value)} />
            </label>
            {action === "correction" ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1 text-sm font-medium">
                  <span>Fields to correct</span>
                  <input className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={fieldKeys} onChange={(event) => setFieldKeys(event.target.value)} placeholder="comma separated" />
                </label>
                <label className="block space-y-1 text-sm font-medium">
                  <span>Documents</span>
                  <input className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={documentTypes} onChange={(event) => setDocumentTypes(event.target.value)} placeholder="comma separated" />
                </label>
              </div>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAction(null)}>
                Cancel
              </Button>
              <Button type="submit">{action === "approve" ? "Approve" : action === "reject" ? "Reject" : "Send request"}</Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
