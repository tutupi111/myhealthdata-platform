"use client";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { RoleLayoutShell } from "@/components/layout/RoleLayoutShell";
import { useLocalizedNav, useRoleTitle } from "@/hooks/useLocalizedNav";
import type { AppRole } from "@/types/layout";

export function LocalizedRoleLayout({
  role,
  children,
}: {
  role: AppRole;
  children: React.ReactNode;
}) {
  const navItems = useLocalizedNav(role);
  const title = useRoleTitle(role);

  return (
    <AuthGuard role={role}>
      <RoleLayoutShell role={role} navItems={navItems} title={title}>
        {children}
      </RoleLayoutShell>
    </AuthGuard>
  );
}
