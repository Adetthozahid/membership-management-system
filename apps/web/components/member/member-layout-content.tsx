"use client";

import { usePathname } from "next/navigation";
import { ProtectedArea } from "@/components/auth/protected-area";
import { MemberFloatingChat } from "@/components/member/member-floating-chat";
import { MemberShell } from "@/components/member/member-shell";

export function MemberLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/member/login";

  if (isLoginPage) {
    return children;
  }

  return (
    <ProtectedArea loginPath="/member/login" requiredPermission="member:access">
      <MemberShell>{children}</MemberShell>
      <MemberFloatingChat />
    </ProtectedArea>
  );
}
