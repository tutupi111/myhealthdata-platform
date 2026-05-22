"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import { Button } from "@/components/ui/button";
import type { AppRole } from "@/types/layout";

const PORTALS: {
  role: AppRole;
  labelKey: "home.patientPortal" | "home.researcherPortal" | "home.adminPortal";
  variant: "default" | "secondary" | "outline";
}[] = [
  { role: "patient", labelKey: "home.patientPortal", variant: "default" },
  { role: "researcher", labelKey: "home.researcherPortal", variant: "secondary" },
  { role: "admin", labelKey: "home.adminPortal", variant: "outline" },
];

/** 从角色选择页进入：先清掉当前登录态，再打开对应端登录页 */
export function RolePortalButtons() {
  const router = useRouter();
  const { logout } = useAuth();
  const { t } = useLocale();

  const enterPortal = (role: AppRole) => {
    logout();
    router.push(`/login?role=${role}`);
  };

  return (
    <div className="flex flex-wrap justify-center gap-4">
      {PORTALS.map(({ role, labelKey, variant }) => (
        <Button key={role} variant={variant} type="button" onClick={() => enterPortal(role)}>
          {t(labelKey)}
        </Button>
      ))}
    </div>
  );
}
