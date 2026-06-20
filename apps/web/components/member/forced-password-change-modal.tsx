"use client";

import { ShieldAlert } from "lucide-react";
import { PasswordChangeForm } from "@/components/member/password-change-form";

export function ForcedPasswordChangeModal({ onChanged }: { onChanged: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/70 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-xl rounded-md border bg-card shadow-2xl shadow-primary/30"
        role="dialog"
        aria-modal="true"
        aria-labelledby="forced-password-title"
      >
        <div className="border-b bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--deep-teal)))] p-5 text-primary-foreground">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-white/12">
              <ShieldAlert className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Required security step</p>
              <h2 id="forced-password-title" className="mt-1 text-2xl font-semibold tracking-normal">
                Change temporary password
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/78">
                This is your first login with a temporary password. Set your own password to continue using the member portal.
              </p>
            </div>
          </div>
        </div>

        <div className="p-5">
          <PasswordChangeForm
            currentPasswordLabel="Current temporary password"
            submitLabel="Change password and continue"
            successLabel="Password changed. Opening your dashboard..."
            onChanged={onChanged}
          />
        </div>
      </div>
    </div>
  );
}
