"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { logout } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function LogoutButton({ redirectTo = "/unauthorized" }: { redirectTo?: string } = {}) {
  const router = useRouter();

  async function onLogout() {
    await logout();
    router.replace(redirectTo);
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={onLogout}>
      <LogOut className="h-4 w-4" aria-hidden="true" />
      Logout
    </Button>
  );
}
