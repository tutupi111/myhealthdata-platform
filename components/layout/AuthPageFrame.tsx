"use client";

import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";

export function AuthPageFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <div className="absolute right-4 top-4 z-10">
        <LanguageSwitcher />
      </div>
      {children}
    </div>
  );
}
