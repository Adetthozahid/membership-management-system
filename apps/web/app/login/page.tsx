import type { Metadata } from "next";
import { headers } from "next/headers";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Login",
};

export default function LoginPage() {
  const headerList = headers();
  const host = (headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "")
    .split(",")[0]
    .trim()
    .toLowerCase();

  return <LoginForm scope={host.startsWith("admin.") ? "admin" : "member"} />;
}
