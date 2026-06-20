"use client";

import { useEffect } from "react";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center justify-center px-4 py-12">
      <section role="alertdialog" aria-labelledby="warning-title" aria-describedby="warning-body" className="w-full rounded-md border bg-card p-6 text-center shadow-sm md:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(var(--terracotta))]/10 text-[hsl(var(--terracotta))]">
          <AlertTriangle className="h-8 w-8" aria-hidden="true" />
        </div>
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.22em] text-[hsl(var(--terracotta))]">
          Smart warning
        </p>
        <h1 id="warning-title" className="mt-3 text-3xl font-semibold tracking-normal text-primary md:text-4xl">
          Something needs attention
        </h1>
        <p id="warning-body" className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          The page could not finish loading safely. Please try again. If the
          issue continues, contact the administrator with the page address.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Button type="button" onClick={reset}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </Button>
          <Button asChild variant="outline">
            <a href="/">
              <Home className="h-4 w-4" aria-hidden="true" />
              Homepage
            </a>
          </Button>
        </div>
      </section>
    </main>
  );
}
