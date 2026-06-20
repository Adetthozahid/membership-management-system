"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { refreshSession, verifyPermission } from "@/lib/auth-client";

function isAdminRootLoginAlias(pathname: string, loginPath: string) {
  if (pathname !== "/" || loginPath !== "/admin/login") return false;
  if (typeof window === "undefined") return false;
  return window.location.hostname.toLowerCase().startsWith("admin.");
}

export function ProtectedArea({
  children,
  loginPath,
  requiredPermission
}: {
  children: React.ReactNode;
  loginPath: string;
  requiredPermission: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "allowed">(() => (pathname === loginPath || isAdminRootLoginAlias(pathname, loginPath) ? "allowed" : "checking"));

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (pathname === loginPath || isAdminRootLoginAlias(pathname, loginPath)) {
        setStatus("allowed");
        return;
      }

      let result: { status: number };
      try {
        result = await verifyPermission(requiredPermission);
      } catch {
        if (!cancelled) router.replace(`/unauthorized?next=${encodeURIComponent(pathname)}`);
        return;
      }
      if (result.status === 401) {
        try {
          const refreshed = await refreshSession();
          result = await verifyPermission(requiredPermission, refreshed.accessToken);
        } catch {
          if (!cancelled) router.replace(`/unauthorized?next=${encodeURIComponent(pathname)}`);
          return;
        }
      }

      if (result.status === 403) {
        if (!cancelled) router.replace("/forbidden");
        return;
      }

      if (result.status >= 400) {
        if (!cancelled) router.replace(loginPath);
        return;
      }

      if (!cancelled) setStatus("allowed");
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, [loginPath, pathname, requiredPermission, router]);

  if (status === "checking") {
    return <div className="rounded-md border bg-card p-5 text-sm text-muted-foreground">Checking session...</div>;
  }

  return children;
}
