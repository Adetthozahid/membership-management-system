"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, Eye, EyeOff, KeyRound, LockKeyhole } from "lucide-react";
import { changePassword } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function PasswordChangeForm({
  currentPasswordLabel = "Current password",
  submitLabel = "Change password",
  successLabel = "Password changed.",
  onChanged
}: {
  currentPasswordLabel?: string;
  submitLabel?: string;
  successLabel?: string;
  onChanged: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(onChanged, 800);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not change password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      {[
        [currentPasswordLabel, currentPassword, setCurrentPassword, "current-password"],
        ["New password", newPassword, setNewPassword, "new-password"],
        ["Confirm new password", confirmPassword, setConfirmPassword, "new-password"]
      ].map(([label, value, setter, autoComplete]) => (
        <label key={label as string} className="block space-y-2 text-sm font-semibold">
          <span>{label as string}</span>
          <span className="relative block">
            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary/75" aria-hidden="true" />
            <input
              className="h-12 w-full rounded-md border bg-card px-4 pl-12 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              type={showPasswords ? "text" : "password"}
              value={value as string}
              onChange={(event) => (setter as (next: string) => void)(event.target.value)}
              autoComplete={autoComplete as string}
              minLength={8}
              required
            />
          </span>
        </label>
      ))}

      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          checked={showPasswords}
          onChange={(event) => setShowPasswords(event.target.checked)}
        />
        <span className="inline-flex items-center gap-1">
          {showPasswords ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
          Show passwords
        </span>
      </label>

      {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      {success ? (
        <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          {successLabel}
        </div>
      ) : null}

      <Button type="submit" className="h-12 w-full" disabled={isSubmitting}>
        <KeyRound className="h-4 w-4" aria-hidden="true" />
        {isSubmitting ? "Changing password" : submitLabel}
      </Button>
    </form>
  );
}
