import { ProtectedArea } from "@/components/auth/protected-area";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedArea loginPath="/admin/login" requiredPermission="admin:access">
      {children}
    </ProtectedArea>
  );
}
