"use client";

import { useEffect, useState } from "react";
import { LoginForm } from "@/components/auth/login-form";

export function LoginPageClient() {
  const [scope, setScope] = useState<"admin" | "member">("member");

  useEffect(() => {
    if (window.location.hostname.toLowerCase().startsWith("admin.")) {
      setScope("admin");
    }
  }, []);

  return <LoginForm scope={scope} />;
}
