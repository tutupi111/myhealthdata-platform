import { RoleLayoutShell } from "@/components/layout";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { adminNavItems } from "@/config/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard role="admin">
      <RoleLayoutShell role="admin" navItems={adminNavItems} title="管理后台">
        {children}
      </RoleLayoutShell>
    </AuthGuard>
  );
}
