"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import type { AppRole } from "@/lib/mock/auth";

const DASHBOARD_BY_ROLE: Record<AppRole, string> = {
  patient: "/patient/dashboard",
  researcher: "/researcher/dashboard",
  admin: "/admin/dashboard",
};

interface AuthGuardProps {
  role: AppRole;
  children: React.ReactNode;
}

export function AuthGuard({ role, children }: AuthGuardProps) {
  const { user, hasChecked } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!hasChecked) return;
    if (!user) {
      const redirect = encodeURIComponent(pathname ?? DASHBOARD_BY_ROLE[role]);
      router.replace(`/login?redirect=${redirect}`);
      return;
    }
    if (user.role !== role) {
      router.replace(DASHBOARD_BY_ROLE[user.role]);
      return;
    }
  }, [hasChecked, user, role, router, pathname]);

  if (!hasChecked) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }
  if (!user || user.role !== role) {
    return null;
  }
  return <>{children}</>;
}
