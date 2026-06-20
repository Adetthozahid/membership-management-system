"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  LogIn,
  Mail,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { apiRequest, login } from "@/lib/auth-client";
import { getAdminUrl, getMemberDashboardUrl } from "@/lib/domains";
import { Button } from "@/components/ui/button";

function navigateTo(url: string) {
  window.location.assign(url);
}

export function LoginForm({ scope }: { scope: "admin" | "member" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isAdmin = scope === "admin";
  const title = isAdmin ? "Admin login" : "Member login";
  const subtitle = isAdmin
    ? "Access the association control panel securely."
    : "Sign in to open your member dashboard.";
  const welcomeTitle = isAdmin ? "Welcome admin!" : "Welcome back!";
  const welcomeCopy = isAdmin
    ? "Manage association operations with confidence."
    : "Access your dashboard and stay connected with your community.";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(scope, email, password);
      if (scope === "admin") {
        navigateTo(getAdminUrl("/admin"));
        return;
      }
      const profile = await apiRequest<{ id: string; memberId: string | null }>("/member/profile");
      navigateTo(getMemberDashboardUrl(profile.memberId ?? profile.id));
    } catch (loginError) {
      setError(
        loginError instanceof Error ? loginError.message : "Login failed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-md border bg-card shadow-xl shadow-primary/10">
      <div className="pointer-events-none absolute right-8 top-32 hidden h-32 w-28 bg-[radial-gradient(circle,hsl(var(--terracotta)/0.18)_1.5px,transparent_2px)] [background-size:16px_16px] lg:block" />
      <div className="grid lg:grid-cols-[0.82fr_1.18fr]">
        <div className="relative hidden min-h-[590px] overflow-hidden border-r bg-[linear-gradient(145deg,hsl(var(--cream)),hsl(var(--card))_58%,hsl(var(--muted)/0.65))] p-9 lg:flex lg:flex-col">
          <div className="absolute -left-8 -top-8 h-40 w-44 opacity-40">
            <div className="h-full w-full rounded-full border border-primary/20" />
          </div>
          <div className="pointer-events-none absolute bottom-0 left-0 h-48 w-full bg-[radial-gradient(circle_at_18%_94%,hsl(var(--terracotta)/0.08),transparent_42%)]" />

          <div className="relative mt-6 flex-1">
            <div className="mx-auto max-w-sm">
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
                  {welcomeTitle}
                </h2>
                <p className="mt-3 text-sm font-medium text-foreground/80">
                  Glad to see you again.
                </p>
                <span className="mx-auto mt-4 block h-0.5 w-10 bg-[hsl(var(--terracotta))]" />
              </div>
            </div>
          </div>

          <div className="relative mx-auto mb-6 max-w-xs text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-primary shadow-sm">
              {isAdmin ? (
                <ShieldCheck className="h-6 w-6" aria-hidden="true" />
              ) : (
                <UsersRound className="h-6 w-6" aria-hidden="true" />
              )}
            </span>
            <p className="mt-4 text-sm leading-6 text-foreground/75">
              {welcomeCopy}
            </p>
          </div>
        </div>

        <div className="relative bg-card px-4 py-7 sm:px-5 sm:py-8 md:p-12 lg:px-16">
          <div className="mx-auto max-w-xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary sm:h-16 sm:w-16">
                {isAdmin ? (
                  <ShieldCheck className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden="true" />
                ) : (
                  <LockKeyhole className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden="true" />
                )}
              </span>
              <div className="min-w-0">
                <h1 className="font-serif text-2xl font-bold tracking-normal text-primary sm:text-3xl md:text-4xl">
                  {title}
                </h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {subtitle}
                </p>
              </div>
            </div>

            <div className="my-7 flex items-center gap-4 text-primary/25 sm:my-9">
              <span className="h-px flex-1 bg-border" />
              <LogIn className="h-4 w-4" aria-hidden="true" />
              <span className="h-px flex-1 bg-border" />
            </div>

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

              <label className="block space-y-2 text-sm font-semibold">
                <span>Password</span>
                <span className="relative block">
                  <LockKeyhole
                    className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary/75"
                    aria-hidden="true"
                  />
                  <input
                    className="h-14 w-full rounded-md border bg-card px-4 pl-12 pr-12 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-primary"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </span>
              </label>

              <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-center gap-2 text-muted-foreground">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span>Remember me</span>
                </label>
                <Link
                  href="/reset-password"
                  className="font-semibold text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              {error ? (
                <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                  {error}
                </p>
              ) : null}

              <Button
                className="h-14 w-full text-base shadow-md shadow-primary/15"
                type="submit"
                disabled={isSubmitting}
              >
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
                {isSubmitting ? "Signing in" : "Sign in"}
              </Button>
            </form>

            {!isAdmin ? (
              <p className="mt-7 text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link
                  href="/register"
                  className="font-semibold text-primary underline-offset-4 hover:underline"
                >
                  Register now
                </Link>
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
