"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <section className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-md border bg-card shadow-xl shadow-primary/10">
      <div className="grid lg:grid-cols-[0.85fr_1.15fr]">
        <div className="relative hidden min-h-[520px] overflow-hidden border-r bg-[linear-gradient(145deg,hsl(var(--cream)),hsl(var(--card))_58%,hsl(var(--muted)/0.65))] p-9 lg:flex lg:flex-col lg:justify-between">
          <div className="mx-auto mt-8 max-w-sm">
            <div className="relative">
              <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-[hsl(var(--terracotta)/0.78)]" />
              <Image
                src="/images/sust-monument-login-retouched.png"
                alt="SUST campus monument"
                width={420}
                height={520}
                className="relative z-10 h-80 w-full rounded-md border bg-card object-cover object-center shadow-xl shadow-primary/15"
                priority
              />
              <div className="pointer-events-none absolute inset-x-4 bottom-0 z-20 h-20 rounded-b-md bg-gradient-to-t from-primary/45 to-transparent" />
            </div>
            <div className="mt-8 text-center">
              <h2 className="font-serif text-3xl font-bold tracking-normal text-primary">
                Reset password
              </h2>
              <p className="mt-3 text-sm leading-6 text-foreground/75">
                Enter your registered email address and follow the next step
                from the association team.
              </p>
              <span className="mx-auto mt-4 block h-0.5 w-10 bg-[hsl(var(--terracotta))]" />
            </div>
          </div>

          <div className="mx-auto mb-6 max-w-xs text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-primary shadow-sm">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="mt-4 text-sm leading-6 text-foreground/75">
              For account safety, password reset requests are verified before
              access is restored.
            </p>
          </div>
        </div>

        <div className="bg-card px-5 py-8 md:p-12 lg:px-16">
          <div className="mx-auto max-w-xl">
            <Link
              href="/login"
              className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to login
            </Link>

            <div className="flex items-center gap-5">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <LockKeyhole className="h-8 w-8" aria-hidden="true" />
              </span>
              <div>
                <h1 className="font-serif text-3xl font-bold tracking-normal text-primary md:text-4xl">
                  Reset password
                </h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Use the email connected with your member or admin account.
                </p>
              </div>
            </div>

            <div className="my-9 h-px bg-border" />

            {submitted ? (
              <div className="rounded-md border bg-muted/50 p-5 text-sm leading-6 text-foreground/80">
                <p className="font-semibold text-primary">
                  Password reset request received.
                </p>
                <p className="mt-2">
                  If <span className="font-semibold">{email}</span> matches an
                  account, the association team can verify and continue the
                  reset process.
                </p>
              </div>
            ) : (
              <form className="space-y-5" onSubmit={onSubmit}>
                <label className="block space-y-2 text-sm font-semibold">
                  <span>Email</span>
                  <span className="relative block">
                    <Mail
                      className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary/75"
                      aria-hidden="true"
                    />
                    <input
                      className="h-14 w-full rounded-md border bg-card px-4 pl-12 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="email"
                      required
                    />
                  </span>
                </label>

                <Button className="h-14 w-full text-base" type="submit">
                  Continue
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
