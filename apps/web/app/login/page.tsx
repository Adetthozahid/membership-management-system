import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Member Login",
};

export default function LoginPage() {
  return <LoginForm scope="member" />;
}
