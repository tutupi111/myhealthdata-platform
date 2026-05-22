"use client";

import { useMemo } from "react";
import { useLocale } from "@/context/LocaleContext";
import type { NavItem, AppRole } from "@/types/layout";

const NAV_CONFIG: Record<AppRole, { key: string; href: string }[]> = {
  patient: [
    { key: "dashboard", href: "/patient/dashboard" },
    { key: "records", href: "/patient/records" },
    { key: "upload", href: "/patient/upload" },
    { key: "studies", href: "/patient/studies" },
    { key: "consents", href: "/patient/consents" },
    { key: "settings", href: "/patient/settings" },
  ],
  researcher: [
    { key: "dashboard", href: "/researcher/dashboard" },
    { key: "projects", href: "/researcher/projects" },
    { key: "newProject", href: "/researcher/projects/new" },
    { key: "requests", href: "/researcher/requests" },
  ],
  admin: [
    { key: "dashboard", href: "/admin/dashboard" },
    { key: "patients", href: "/admin/patients" },
    { key: "researchers", href: "/admin/researchers" },
    { key: "projects", href: "/admin/projects" },
    { key: "records", href: "/admin/records" },
    { key: "consents", href: "/admin/consents" },
    { key: "aiModels", href: "/admin/ai-models" },
    { key: "aiTasks", href: "/admin/ai-tasks" },
    { key: "aiLogs", href: "/admin/ai-logs" },
    { key: "auditLogs", href: "/admin/audit-logs" },
    { key: "account", href: "/admin/account" },
  ],
};

export function useLocalizedNav(role: AppRole): NavItem[] {
  const { t } = useLocale();

  return useMemo(
    () =>
      NAV_CONFIG[role].map(({ key, href }) => ({
        href,
        title: t(`nav.${role}.${key}`),
      })),
    [role, t]
  );
}

export function useRoleTitle(role: AppRole): string {
  const { t } = useLocale();
  return t(`roles.${role}`);
}
