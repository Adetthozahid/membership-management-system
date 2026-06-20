import Link from "next/link";
import { Home, SearchX, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center justify-center px-4 py-12">
      <section className="w-full rounded-md border bg-card p-6 text-center shadow-sm md:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <SearchX className="h-8 w-8" aria-hidden="true" />
        </div>
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.22em] text-[hsl(var(--terracotta))]">
          Page not found
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal text-primary md:text-4xl">
          This page is not available
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          The page may have been moved, renamed, or the link may be incorrect.
          Please go back or return to the homepage.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild variant="outline">
            <Link href="/members">
              <UsersRound className="h-4 w-4" aria-hidden="true" />
              Members
            </Link>
          </Button>
          <Button asChild>
            <Link href="/">
              <Home className="h-4 w-4" aria-hidden="true" />
              Homepage
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
