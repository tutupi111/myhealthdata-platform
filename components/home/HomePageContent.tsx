"use client";

import { RolePortalButtons } from "@/components/auth/RolePortalButtons";
import { AuthPageFrame } from "@/components/layout/AuthPageFrame";
import { useLocale } from "@/context/LocaleContext";

export function HomePageContent() {
  const { t } = useLocale();

  return (
    <AuthPageFrame>
      <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background p-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">{t("home.title")}</h1>
          <p className="text-muted-foreground">{t("home.subtitle")}</p>
        </div>
        <RolePortalButtons />
      </main>
    </AuthPageFrame>
  );
}
