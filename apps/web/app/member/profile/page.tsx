"use client";

import { useState } from "react";
import { KeyRound, Mail, ShieldAlert, X } from "lucide-react";
import { useMemberEndpoint, type MemberProfileData } from "@/components/member/member-data";
import { PasswordChangeForm } from "@/components/member/password-change-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/auth-client";

function date(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : "-";
}

function profileSocialLinks(data: MemberProfileData) {
  return data.socialLinks ?? [
    { key: "website_url", label: "Website", value: "" },
    { key: "facebook_url", label: "Facebook", value: "" },
    { key: "instagram_url", label: "Instagram", value: "" },
    { key: "linkedin_url", label: "LinkedIn", value: "" }
  ];
}

export default function MemberProfilePage() {
  const { data, error, refetch } = useMemberEndpoint<MemberProfileData>("/member/profile");
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [editingSocials, setEditingSocials] = useState(false);
  const [socialDraft, setSocialDraft] = useState<Record<string, string>>({});
  const [socialMessage, setSocialMessage] = useState<string | null>(null);
  const [socialError, setSocialError] = useState<string | null>(null);
  const [savingSocials, setSavingSocials] = useState(false);

  if (error) return <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  if (!data) return <div className="rounded-md border bg-card p-5 text-sm text-muted-foreground">Loading profile...</div>;
  const profile = data;
  const socialLinks = profileSocialLinks(profile);

  const fields = [
    ["Member ID", profile.memberId ?? "-"],
    ["Full name", profile.fullName],
    ["Username", profile.username],
    ["Email", profile.email],
    ["Phone", profile.phone ?? "-"],
    ["Status", profile.status],
    ["Membership type", profile.membershipType?.name ?? "-"],
    ["Joined", date(profile.joinedAt)],
    ["Approved", date(profile.approvedAt)],
    ["Expires", date(profile.expiredAt)]
  ];

  function startSocialEdit() {
    setSocialDraft(Object.fromEntries(socialLinks.map((link) => [link.key, String(link.value ?? "")])));
    setSocialMessage(null);
    setSocialError(null);
    setEditingSocials(true);
  }

  async function submitSocialCorrection() {
    const values = Object.fromEntries(
      socialLinks
        .filter((link) => (socialDraft[link.key] ?? "") !== String(link.value ?? ""))
        .map((link) => [link.key, socialDraft[link.key] ?? ""])
    );

    if (!Object.keys(values).length) {
      setSocialError("Please change at least one social link.");
      return;
    }

    setSavingSocials(true);
    setSocialError(null);
    setSocialMessage(null);
    try {
      const response = await apiRequest<{ message: string }>("/member/profile/social-links", {
        method: "POST",
        body: JSON.stringify(values)
      });
      setSocialMessage(response.message);
      setEditingSocials(false);
      await refetch();
    } catch (caught) {
      setSocialError(caught instanceof Error ? caught.message : "Could not submit social links.");
    } finally {
      setSavingSocials(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-primary">My profile</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">Profile</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Core details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          {fields.map(([label, value]) => (
            <div key={label} className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="mt-1 font-medium capitalize">{value}</div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Social links</CardTitle>
          {editingSocials ? (
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={submitSocialCorrection} disabled={savingSocials}>
                {savingSocials ? "Saving..." : "Save"}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setEditingSocials(false)} disabled={savingSocials}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button type="button" size="sm" onClick={startSocialEdit}>
              Edit Links
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {socialMessage ? <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">{socialMessage}</div> : null}
          {socialError ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-red-700">{socialError}</div> : null}
          <div className="grid gap-3 md:grid-cols-2">
            {socialLinks.map((link) => (
              <label key={link.key} className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">{link.label}</div>
                {editingSocials ? (
                  <input
                    className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none ring-primary/20 focus:ring-2"
                    value={socialDraft[link.key] ?? ""}
                    onChange={(event) => setSocialDraft((current) => ({ ...current, [link.key]: event.target.value }))}
                    placeholder={`${link.label} URL`}
                    type="url"
                  />
                ) : (
                  <div className="mt-1 break-all font-medium normal-case">{String(link.value ?? "") || "-"}</div>
                )}
              </label>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" aria-hidden="true" />
            Account security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-md border p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Mail className="h-4 w-4" aria-hidden="true" />
                Username
              </div>
              <div className="mt-1 break-all font-medium normal-case">{profile.username}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Password status</div>
              <div className="mt-1 font-medium">{profile.mustChangePassword ? "Temporary password active" : "Password set"}</div>
            </div>
          </div>
          {profile.mustChangePassword ? (
            <div className="flex gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <p>Please change your temporary password to secure your account.</p>
            </div>
          ) : null}
          <Button type="button" onClick={() => setChangePasswordOpen(true)}>
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            Change Password
          </Button>
        </CardContent>
      </Card>
      <div className="rounded-md border bg-muted p-4 text-sm text-muted-foreground">{profile.editing.message}</div>
      {changePasswordOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-md border bg-card shadow-2xl shadow-primary/30" role="dialog" aria-modal="true" aria-labelledby="profile-password-title">
            <div className="flex items-start justify-between gap-4 border-b bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--deep-teal)))] p-5 text-primary-foreground">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Account security</p>
                <h2 id="profile-password-title" className="mt-1 text-2xl font-semibold tracking-normal">Change password</h2>
                <p className="mt-2 text-sm leading-6 text-white/78">Update your member account password.</p>
              </div>
              <button
                type="button"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/10 text-white transition hover:bg-white/20"
                onClick={() => setChangePasswordOpen(false)}
                aria-label="Close password modal"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="p-5">
              <PasswordChangeForm
                currentPasswordLabel={profile.mustChangePassword ? "Current temporary password" : "Current password"}
                submitLabel="Change password"
                successLabel="Password changed."
                onChanged={() => {
                  setChangePasswordOpen(false);
                  window.location.reload();
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
